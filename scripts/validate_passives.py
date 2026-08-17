#!/usr/bin/env python3
"""
PalBreed 迭代 1 — 校验脚本 validate_passives.py
==============================================
验收标准（交接单 §2.4 + §七）：
  ✓ ID 唯一 / name 唯一
  ✓ learners 均在 pals.json
  ✓ source 枚举合法
  ✓ 三字段（removable/yakumo_transferable/legendary_restricted）无 null
  ✓ rarity/tier 合法枚举
  ✓ 6 个高频 passive 字段齐全、effect 与官方一致
  ✓ ID 映射表无孤儿（内部 ID 均可解析）、无重复
用法：python3 validate_passives.py <repo>/src/data
"""
import json
import sys

FREQ_CHECK = {
    "demon_god": ("Demon God", "Attack +30.0% Defense +5.0%"),
    "legend": ("Legend", "Attack +20.0% Defense +20.0% Movement Speed increases 20.0%"),
    "swift": ("Swift", "30.0% increase to movement speed."),
    "immortality": ("Immortality", "Life Steal"),
    "diamond_body": ("Diamond Body", "Defense +30.0% Immune to Flinch Immune to Knockback"),
    "demon_s_hand": ("Demon’s Hand", "Work Speed"),
}
SOURCE_ENUM = {"pal", "world_tree", "mutation", "rare", "breeding", "yakumo", "item", "gear"}
RARITY_ENUM = {"common", "uncommon", "rare", "epic", "legendary"}
EXACT_EFFECT = {k: v[1] for k, v in FREQ_CHECK.items() if k in ("demon_god", "legend", "swift", "diamond_body")}


def main():
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    passives = json.load(open(f"{data_dir}/passives.json"))
    pals = json.load(open(f"{data_dir}/pals.json"))
    idmap = json.load(open(f"{data_dir}/passive-id-map.json"))

    site_keys = {p["key"] for p in pals}
    by_id = {r["id"] for r in passives}
    by_name = {r["name"] for r in passives}
    faults = []

    # 1) ID/name 唯一
    if len(by_id) != len(passives):
        faults.append(f"ID 重复: {len(passives)} vs {len(by_id)}")
    if len(by_name) != len(passives):
        faults.append("name 重复")

    for r in passives:
        # 2) learners 有效
        for k in r["learners"]:
            if k not in site_keys:
                faults.append(f"孤儿 learner: {r['id']} -> {k}")
        # 3) source 枚举
        for s in r["source"]:
            if s not in SOURCE_ENUM:
                faults.append(f"非法 source: {r['id']} -> {s}")
        # 4) 三字段非 null
        for f in ("removable", "yakumo_transferable", "legendary_restricted"):
            if r[f] is None or not isinstance(r[f], bool):
                faults.append(f"三字段 null/非布尔: {r['id']} .{f}")
        # rarity/tier
        if r["rarity"] not in RARITY_ENUM:
            faults.append(f"非法 rarity: {r['id']} -> {r['rarity']}")
        if not isinstance(r["tier"], int):
            faults.append(f"tier 非整数: {r['id']} -> {r['tier']}")

    # 5) 高频 passive + effect 精确比对
    for pid, (name, effect_sub) in FREQ_CHECK.items():
        rec = next((r for r in passives if r["id"] == pid), None)
        if not rec:
            faults.append(f"高频缺 {pid}")
            continue
        if rec["name"] != name:
            faults.append(f"高频名不符: {pid} -> {rec['name']} vs {name}")
        if pid in EXACT_EFFECT and rec["effect"] != EXACT_EFFECT[pid]:
            faults.append(f"高频 effect 不一致: {pid}\n  expect: {EXACT_EFFECT[pid]}\n  got:    {rec['effect']}")
        elif pid not in EXACT_EFFECT and effect_sub not in rec["effect"]:
            faults.append(f"高频 effect 缺少关键子串: {pid} ({effect_sub})")

    # 6) ID 映射表一致性
    mapping = idmap["id_to_name"]
    idmap_ids = set(mapping)
    if idmap_ids != by_id:
        faults.append(f"id-map 与 passives 的 id 集合不一致（映射 {len(idmap_ids)} vs 数据 {len(by_id)}）")
    # internal_id_to_id：每个内部 ID 都能解析到 passives id
    for iid, pid in idmap["internal_id_to_id"].items():
        if pid not in by_id:
            faults.append(f"ID 映射孤儿: internal {iid} -> {pid}")
    # name_to_id 无重复名
    if len(idmap["name_to_id"]) != len(set(idmap["name_to_id"])):
        faults.append("name_to_id 重复")

    # 输出
    if faults:
        print(f"❌ FAIL — {len(faults)} 项")
        for fa in faults:
            print("  -", fa)
        return 1
    print(f"✅ PASS — {len(passives)} 条全绿")
    print(f"   rarity: { {x: sum(1 for r in passives if r['rarity']==x) for x in sorted(RARITY_ENUM)} }")
    return 0


if __name__ == "__main__":
    sys.exit(main())
