#!/usr/bin/env python3
"""
PalBreed 数据处理管线
- 输入: /root/palworld-db.json (299 Pals) + /root/palworld-breeding-v26.json (44,851 原始行)
- 输出: src/data/pals.json + public/data/forward-index.json + public/data/reverse-index.json
- 规范: PRD v3 §10 数据合同 (parentLow < parentHigh 字典序, 去重, 冲突禁止静默)
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = "/root/palworld-db.json"
BREEDING_PATH = "/root/palworld-breeding-v26.json"
OUT_DIR = os.path.join(ROOT, "public", "data")
SRC_DATA_DIR = os.path.join(ROOT, "src", "data")

def slugify(name: str) -> str:
    """InternalName -> URL slug (lowercase, ascii)"""
    return name.lower()

def load_pals():
    with open(DB_PATH, encoding="utf-8") as f:
        db = json.load(f)
    pals = []
    for p in db["Pals"]:
        internal = p["InternalName"]
        key = slugify(internal)
        ws = {}
        for wtype, wlevel in (p.get("WorkSuitability") or {}).items():
            if wlevel and wlevel > 0:
                ws[wtype.lower()] = wlevel
        pals.append({
            "key": key,
            "name": p.get("Name", internal),
            "internalName": internal,
            "imageUrl": f"/assets/pals/{key}.png",
            "breedingValue": p.get("BreedingPower", 0),
            "hp": p.get("Hp", 0),
            "attack": p.get("Attack", 0),
            "defense": p.get("Defense", 0),
            "workSuitability": ws,
            "nocturnal": p.get("Nocturnal", False),
            "size": p.get("Size", ""),
            "rarity": p.get("Rarity", 0),
        })
    # key 去重保护
    keys = [p["key"] for p in pals]
    dupes = {k for k in keys if keys.count(k) > 1}
    if dupes:
        print(f"[FATAL] 重复 Pal key: {dupes}", file=sys.stderr)
        sys.exit(1)
    print(f"[OK] pals: {len(pals)} 只 (key 无重复)")
    return pals

def load_breeding():
    with open(BREEDING_PATH, encoding="utf-8") as f:
        data = json.load(f)
    records = data["Breeding"]
    print(f"[OK] breeding 原始行: {len(records)}")
    return records

def build_indexes(pals, records):
    pal_keys = {p["key"] for p in pals}
    # 1. 规范化 + 去重（支持性别感知键：同一对 internalName 因性别不同产出不同子代时，
    #    生成 "low(g)+high(g)" 性别键，不静默丢弃。见 CHANGELOG 2026-08-09 数据决策）
    forward = {}   # "low+high" 或 "low(g)+high(g)" -> child
    reverse = {}   # child -> ["low+high" 或 "low(g)+high(g)", ...]
    skipped_invalid = 0
    for r in records:
        p1 = slugify(r["Parent1InternalName"])
        p2 = slugify(r["Parent2InternalName"])
        child = slugify(r["ChildInternalName"])
        if p1 not in pal_keys or p2 not in pal_keys or child not in pal_keys:
            skipped_invalid += 1
            continue
        low, high = sorted([p1, p2])
        g1 = r.get("Parent1Gender", "WILDCARD")
        g2 = r.get("Parent2Gender", "WILDCARD")
        # 性别规范化：如果源行有具体性别且与 internalName 顺序对应，则生成性别键
        if g1 != "WILDCARD" or g2 != "WILDCARD":
            if p1 == low:
                key = f"{low}({g1[0].lower()})+{high}({g2[0].lower()})"
            else:
                key = f"{low}({g2[0].lower()})+{high}({g1[0].lower()})"
        else:
            key = f"{low}+{high}"
        if key in forward and forward[key] != child:
            print(f"[FATAL] 冲突: {key} -> {forward[key]} vs {child} (禁止静默取 latest)", file=sys.stderr)
            sys.exit(1)
        forward[key] = child
    # 2. 构建 reverse（性别键保留在组合字符串中）
    for key, child in forward.items():
        reverse.setdefault(child, []).append(key)
    # 3. 同种繁殖自反一致性校验
    self_ref_errors = 0
    for key, child in forward.items():
        low, high = key.replace("(f)", "").replace("(m)", "").split("+")
        if low == high and child != low:
            self_ref_errors += 1
    if self_ref_errors:
        print(f"[FATAL] 同种繁殖不一致 {self_ref_errors} 条", file=sys.stderr)
        sys.exit(1)
    print(f"[OK] forward pairs: {len(forward)} (去重后, 含性别键)")
    print(f"[OK] reverse children: {len(reverse)}")
    print(f"[OK] 无效记录过滤: {skipped_invalid} 条")

    # 4. 识别性别依赖组合（同一对 internalName 存在 ≥2 个性别键）
    sex_dependent = {}
    base_groups = {}
    for key in forward:
        base = key.replace("(f)", "").replace("(m)", "")
        base_groups.setdefault(base, []).append(key)
    for base, keys in base_groups.items():
        if len(keys) > 1 and any("(" in k for k in keys):
            variants = {k: forward[k] for k in keys}
            sex_dependent[base] = variants
    if sex_dependent:
        print(f"[OK] 性别依赖组合: {len(sex_dependent)} 个 -> {sex_dependent}")
    return forward, reverse, sex_dependent

def main():
    pals = load_pals()
    records = load_breeding()
    forward, reverse, sex_dependent = build_indexes(pals, records)

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(SRC_DATA_DIR, exist_ok=True)

    # src/data/pals.json — 构建期内联 (PalSelector 用, 内联进 HTML)
    with open(os.path.join(SRC_DATA_DIR, "pals.json"), "w", encoding="utf-8") as f:
        json.dump(pals, f, ensure_ascii=False, separators=(",", ":"))
    print(f"[OK] src/data/pals.json ({len(pals)} pals)")

    # src/data/sex-dependent.json — 性别依赖组合元数据 (内联给查询组件)
    with open(os.path.join(SRC_DATA_DIR, "sex-dependent.json"), "w", encoding="utf-8") as f:
        json.dump(sex_dependent, f, ensure_ascii=False, separators=(",", ":"))
    print(f"[OK] src/data/sex-dependent.json ({len(sex_dependent)} 组合)")

    # public/data/forward-index.json — 正查 Tab 按需懒加载
    with open(os.path.join(OUT_DIR, "forward-index.json"), "w", encoding="utf-8") as f:
        json.dump(forward, f, ensure_ascii=False, separators=(",", ":"))
    fwd_size = os.path.getsize(os.path.join(OUT_DIR, "forward-index.json"))
    print(f"[OK] forward-index.json ({fwd_size/1024/1024:.2f} MB raw)")

    # public/data/reverse-index.json — 反查 Tab 按需懒加载
    with open(os.path.join(OUT_DIR, "reverse-index.json"), "w", encoding="utf-8") as f:
        json.dump(reverse, f, ensure_ascii=False, separators=(",", ":"))
    rev_size = os.path.getsize(os.path.join(OUT_DIR, "reverse-index.json"))
    print(f"[OK] reverse-index.json ({rev_size/1024/1024:.2f} MB raw)")

    # public/data/version.json — 数据版本徽章（PRD §5/§10：版本元数据）
    import hashlib
    with open(BREEDING_PATH, "rb") as f:
        src_hash = hashlib.sha256(f.read()).hexdigest()[:12]
    version = {
        "gameVersion": "1.0",
        "datasetVersion": "v26",
        "source": "tylercamp/palcalc",
        "sourceCommit": "be2ec7a95c52",
        "pairs": len(forward),
        "pals": len(pals),
        "sourceHash": src_hash,
        "generatedAt": __import__("datetime").datetime.now().strftime("%Y-%m-%d"),
    }
    with open(os.path.join(OUT_DIR, "version.json"), "w", encoding="utf-8") as f:
        json.dump(version, f, ensure_ascii=False, separators=(",", ":"))
    # 同时输出到 src/data 供组件构建期内联（Footer 徽章）
    with open(os.path.join(SRC_DATA_DIR, "version.json"), "w", encoding="utf-8") as f:
        json.dump(version, f, ensure_ascii=False, separators=(",", ":"))
    print(f"[OK] version.json (v26 · {version['pairs']} pairs · {version['generatedAt']})")

    # 校验: 每个 Pal 至少有 1 条记录 (或标记不可育种)
    no_record = [p["key"] for p in pals if p["key"] not in reverse]
    if no_record:
        print(f"[WARN] 无配种记录 Pal: {len(no_record)} 只 -> {no_record[:10]}{'...' if len(no_record)>10 else ''}")
    else:
        print("[OK] 反查完整性: 所有 Pal 均有配种记录")

    print(f"\n[DONE] 数据管线完成: {len(pals)} pals / {len(forward)} 配种对 / {len(reverse)} 反查条目")

if __name__ == "__main__":
    main()
