"""One-time, idempotent migration of five duplicate labels into true coverage gaps."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


REPLACEMENTS = {
    "Khản tiếng cơ năng": {
        "name_vi": "Hăm kẽ do ẩm",
        "name_en": "Intertrigo",
        "category": "dermatology",
        "aliases": ["Hăm kẽ", "Viêm da kẽ", "Hăm da do ẩm"],
        "urgency": "low",
        "description": "Tình trạng viêm kích ứng ở vùng hai bề mặt da cọ xát và giữ ẩm như bẹn, nách, dưới vú hoặc nếp bụng, gây đỏ rát và dễ bội nhiễm.",
        "symptoms": {
            "common": [
                {"name_vi": "Mảng da đỏ ẩm ở nếp gấp", "name_en": "Moist red patch in a skin fold", "frequency": "very_common"},
                {"name_vi": "Rát xót tăng khi ra mồ hôi", "name_en": "Burning worsened by sweating", "frequency": "common"},
                {"name_vi": "Ngứa nhẹ đến vừa tại vùng da cọ xát", "name_en": "Mild to moderate itch at friction area", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Da nứt nông hoặc rỉ dịch nhẹ", "name_en": "Superficial fissuring or mild weeping", "frequency": "occasional"},
                {"name_vi": "Mùi khó chịu ở nếp da ẩm", "name_en": "Odor from the moist skin fold", "frequency": "occasional"}
            ]
        },
        "red_flags": [
            "Vùng đỏ sưng nóng lan nhanh, đau tăng hoặc chảy mủ kèm sốt",
            "Da chuyển tím đen, phồng rộp hoặc đau dữ dội bất thường",
            "Tổn thương lan rộng ở người đái tháo đường hoặc suy giảm miễn dịch"
        ],
        "risk_factors": ["Thời tiết nóng ẩm", "Thừa cân có nhiều nếp da", "Quần áo chật bí", "Ra nhiều mồ hôi"],
        "questions_to_ask": [
            "Vùng đỏ nằm ở nếp bẹn, nách, dưới vú hay nếp bụng?",
            "Da có rỉ dịch, mùi hôi, mụn mủ hoặc lan nhanh không?",
            "Bạn có đái tháo đường hoặc đang suy giảm miễn dịch không?"
        ],
        "differential_diagnoses": ["Nấm Candida kẽ", "Hắc lào vùng bẹn", "Viêm da tiếp xúc"],
        "when_to_seek_emergency": ["Sốt kèm vùng da sưng nóng đỏ lan nhanh, đau dữ dội hoặc hoại tử"],
        "user_language_variants": [
            "nếp bẹn đỏ ẩm rát mỗi khi đi lại ra mồ hôi",
            "dưới ngực bị hăm đỏ ngứa và có mùi lúc trời nóng",
            "nếp bụng ẩm ướt cọ vào nhau đau rát",
            "vùng nách đỏ hăm do mồ hôi bí lâu ngày",
            "da giữa các nếp gấp đỏ rỉ nhẹ và xót"
        ]
    },
    "Đầy bụng khó tiêu chức năng": {
        "name_vi": "Móng chân mọc ngược",
        "name_en": "Ingrown Toenail",
        "category": "dermatology",
        "aliases": ["Móng quặp", "Móng chân chọc thịt", "Móng mọc vào khóe"],
        "urgency": "low",
        "description": "Bờ móng chân, thường ở ngón cái, cong và chèn vào rãnh móng gây đau, đỏ và sưng tại khóe móng.",
        "symptoms": {
            "common": [
                {"name_vi": "Đau ở một bên khóe móng chân", "name_en": "Pain along one toenail edge", "frequency": "very_common"},
                {"name_vi": "Bờ móng cong chọc vào da", "name_en": "Nail edge curves into skin", "frequency": "very_common"},
                {"name_vi": "Da quanh khóe móng đỏ và sưng", "name_en": "Red swollen skin beside nail", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Đau tăng khi mang giày chật", "name_en": "Pain worsened by tight shoes", "frequency": "occasional"},
                {"name_vi": "Mô hạt nhỏ hoặc rỉ dịch ở khóe móng", "name_en": "Granulation tissue or mild drainage", "frequency": "occasional"}
            ]
        },
        "red_flags": [
            "Khóe móng chảy mủ, đỏ lan lên bàn chân hoặc kèm sốt",
            "Ngón chân tím tái, lạnh hoặc mất cảm giác",
            "Móng mọc ngược ở người đái tháo đường hoặc bệnh mạch máu ngoại biên"
        ],
        "risk_factors": ["Cắt móng quá sát và bo tròn", "Mang giày chật", "Móng cong bẩm sinh", "Chấn thương ngón chân"],
        "questions_to_ask": [
            "Bờ móng có đang chọc sâu vào da và chảy mủ không?",
            "Bạn thường cắt móng sát hoặc mang giày chật không?",
            "Bạn có đái tháo đường, mất cảm giác chân hoặc bệnh mạch máu không?"
        ],
        "differential_diagnoses": ["Viêm quanh móng", "Nấm móng", "Chấn thương giường móng"],
        "when_to_seek_emergency": ["Đỏ sưng lan nhanh kèm sốt hoặc ngón chân tím lạnh mất cảm giác"],
        "user_language_variants": [
            "khóe móng ngón cái chọc vào thịt đi giày rất đau",
            "móng chân bị quặp làm một bên ngón sưng đỏ",
            "cắt móng sát xong mép móng đâm vào da đau nhói",
            "bờ móng chân mọc xiên vào khóe có ít dịch",
            "ngón chân đau ở rãnh móng mỗi khi bước đi"
        ]
    },
    "Táo bón chức năng": {
        "name_vi": "Viêm quanh móng nhẹ",
        "name_en": "Mild Paronychia",
        "category": "dermatology",
        "aliases": ["Sưng khóe móng", "Chín mé nhẹ", "Viêm nếp móng"],
        "urgency": "low",
        "description": "Viêm khu trú ở nếp da quanh móng tay hoặc móng chân, thường sau xước da, cắn móng hoặc làm móng, gây đỏ, sưng và đau tại chỗ.",
        "symptoms": {
            "common": [
                {"name_vi": "Nếp da cạnh móng đỏ và sưng", "name_en": "Red swollen nail fold", "frequency": "very_common"},
                {"name_vi": "Đau nhói khi ấn quanh móng", "name_en": "Tenderness around nail", "frequency": "very_common"},
                {"name_vi": "Cảm giác căng tức ở khóe móng", "name_en": "Tight pressure at nail edge", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Túi mủ nhỏ sát bờ móng", "name_en": "Small pus pocket beside nail", "frequency": "occasional"},
                {"name_vi": "Da quanh móng bong xước", "name_en": "Torn skin around nail", "frequency": "occasional"}
            ]
        },
        "red_flags": [
            "Đỏ sưng lan nhanh dọc ngón hoặc bàn tay kèm sốt",
            "Đau dữ dội, ngón căng cứng hoặc có vệt đỏ chạy lên cánh tay",
            "Nhiễm trùng quanh móng ở người đái tháo đường hoặc suy giảm miễn dịch"
        ],
        "risk_factors": ["Cắn móng tay", "Cắt khóe móng sâu", "Làm móng gây xước", "Tay thường xuyên ngâm nước"],
        "questions_to_ask": [
            "Quanh móng có túi mủ hay đỏ lan khỏi ngón không?",
            "Trước đó bạn có cắt da, cắn móng hoặc làm móng không?",
            "Bạn có sốt, đái tháo đường hoặc suy giảm miễn dịch không?"
        ],
        "differential_diagnoses": ["Móng mọc ngược", "Chín mé sâu đầu ngón", "Herpes đầu ngón"],
        "when_to_seek_emergency": ["Sốt, đau tăng nhanh, đỏ lan theo bàn tay hoặc có vệt đỏ chạy lên cánh tay"],
        "user_language_variants": [
            "khóe móng tay sưng đỏ ấn vào đau sau khi cắt da",
            "cạnh móng có một chấm mủ nhỏ và căng tức",
            "cắn móng xong phần da quanh móng viêm đau",
            "nếp móng ngón tay đỏ nhức nhưng chưa lan",
            "làm móng về khóe móng sưng và rát"
        ]
    },
    "Ốm nghén nôn nhiều": {
        "name_vi": "Phồng rộp da do ma sát",
        "name_en": "Friction Blister",
        "category": "dermatology",
        "aliases": ["Bóng nước do cọ xát", "Phồng chân do giày", "Bọng nước ma sát"],
        "urgency": "low",
        "description": "Bọng dịch nông hình thành khi da bị cọ xát lặp lại, thường ở gót chân hoặc lòng bàn tay, gây rát và đau khi tiếp tục tì đè.",
        "symptoms": {
            "common": [
                {"name_vi": "Bọng nước trong tại vùng bị cọ xát", "name_en": "Clear blister at friction site", "frequency": "very_common"},
                {"name_vi": "Rát và đau khi tì đè", "name_en": "Burning pain with pressure", "frequency": "very_common"},
                {"name_vi": "Da quanh bọng hơi đỏ", "name_en": "Mild redness around blister", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Lớp da mái bọng bị rách", "name_en": "Blister roof tears", "frequency": "occasional"},
                {"name_vi": "Rỉ dịch trong sau khi bọng vỡ", "name_en": "Clear drainage after rupture", "frequency": "occasional"}
            ]
        },
        "red_flags": [
            "Dịch chuyển đục như mủ, vùng đỏ nóng lan rộng hoặc kèm sốt",
            "Bọng nước xuất hiện dày đặc không do cọ xát hoặc kèm tổn thương niêm mạc",
            "Bọng chân ở người đái tháo đường, mất cảm giác hoặc tuần hoàn chân kém"
        ],
        "risk_factors": ["Giày mới hoặc quá chật", "Đi bộ đường dài", "Lao động cầm nắm lặp lại", "Da ẩm do mồ hôi"],
        "questions_to_ask": [
            "Bọng xuất hiện sau đi giày mới, đi bộ hoặc cầm dụng cụ lâu phải không?",
            "Dịch trong bọng còn trong hay đã đục và có mùi?",
            "Bạn có đái tháo đường hoặc mất cảm giác bàn chân không?"
        ],
        "differential_diagnoses": ["Bỏng độ hai", "Chàm tổ đỉa", "Chốc bọng nước"],
        "when_to_seek_emergency": ["Đỏ nóng lan nhanh, chảy mủ kèm sốt hoặc tổn thương ở bàn chân đái tháo đường"],
        "user_language_variants": [
            "đi giày mới làm gót chân nổi bóng nước trong rất rát",
            "đi bộ xa xong lòng bàn chân phồng bọng đau",
            "tay cầm dụng cụ lâu nổi bọng nước do cọ xát",
            "mép giày chà vào chân làm da phồng rộp",
            "bóng nước ở gót bị vỡ rỉ dịch trong"
        ]
    },
    "Đau mắt đỏ": {
        "name_vi": "Dày sừng nang lông",
        "name_en": "Keratosis Pilaris",
        "category": "dermatology",
        "aliases": ["Da gà ở cánh tay", "Sần nang lông", "Keratosis pilaris"],
        "urgency": "low",
        "description": "Tình trạng keratin tích tụ tại nang lông tạo nhiều sẩn nhỏ ráp như da gà, thường ở mặt ngoài cánh tay, đùi hoặc má và không lây.",
        "symptoms": {
            "common": [
                {"name_vi": "Nhiều nốt nhỏ ráp đồng đều quanh nang lông", "name_en": "Uniform rough follicular bumps", "frequency": "very_common"},
                {"name_vi": "Da sờ giống da gà hoặc giấy nhám", "name_en": "Gooseflesh or sandpaper texture", "frequency": "very_common"},
                {"name_vi": "Tập trung ở mặt ngoài cánh tay hoặc đùi", "name_en": "Outer upper arms or thighs affected", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Nốt hơi đỏ hoặc ngứa khi da khô", "name_en": "Mild redness or itch with dry skin", "frequency": "occasional"},
                {"name_vi": "Tăng rõ vào mùa lạnh", "name_en": "Worsens in cold dry weather", "frequency": "occasional"}
            ]
        },
        "red_flags": [
            "Sẩn chuyển thành mụn mủ đau, sưng nóng lan rộng hoặc kèm sốt",
            "Ban đỏ lan toàn thân kèm khó thở hoặc phù môi lưỡi",
            "Tổn thương bong trợt rộng hoặc xuất huyết không giải thích được"
        ],
        "risk_factors": ["Da khô", "Viêm da cơ địa", "Tiền sử gia đình", "Thời tiết lạnh khô"],
        "questions_to_ask": [
            "Các nốt có tập trung ở mặt ngoài cánh tay và tồn tại lâu không?",
            "Nốt chỉ ráp hay có mủ, đau và lan nhanh?",
            "Bạn có da khô hoặc viêm da cơ địa không?"
        ],
        "differential_diagnoses": ["Viêm nang lông", "Mụn trứng cá", "Rôm sảy"],
        "when_to_seek_emergency": ["Khó thở, phù môi lưỡi hoặc ban đỏ lan nhanh toàn thân"],
        "user_language_variants": [
            "mặt ngoài cánh tay nổi hạt li ti sờ ráp như da gà",
            "da đùi có nhiều chấm sần quanh lỗ chân lông",
            "tay sần như giấy nhám nặng hơn lúc trời lạnh",
            "các nốt da gà nhỏ đều không đau không lây",
            "da khô nổi hạt quanh nang lông hơi đỏ"
        ]
    }
}

VALIDATION_QUERIES = {
    "EXP_609": ("Hăm kẽ do ẩm", [
        "Nếp bẹn đỏ ẩm và xót khi hai mặt da cọ nhau",
        "Dưới ngực bị hăm ngứa vào ngày nóng ra nhiều mồ hôi",
        "Nếp bụng có mảng đỏ ướt, mặc đồ bí thì rát hơn",
        "Vùng nách hăm đỏ nhẹ nhưng chưa có mủ hay sốt",
        "Da ở nếp gấp cọ xát có mùi và nứt nông"
    ]),
    "EXP_616": ("Móng chân mọc ngược", [
        "Mép móng ngón cái cong vào da làm khóe chân đau",
        "Đi giày kín là bờ móng chọc thịt đau hơn",
        "Khóe móng chân đỏ sưng vì móng mọc xiên vào",
        "Cắt móng quá sát xong một bên ngón cái đau nhói",
        "Móng chân bị quặp, quanh mép có ít mô đỏ"
    ]),
    "EXP_619": ("Viêm quanh móng nhẹ", [
        "Da sát móng tay sưng đỏ sau khi tôi cắn móng",
        "Khóe móng có túi mủ rất nhỏ và ấn đau",
        "Làm móng xong nếp da cạnh móng căng tức",
        "Quanh móng ngón tay đỏ nhức nhưng chưa lan lên bàn tay",
        "Xước da ở khóe móng rồi chỗ đó viêm nhẹ"
    ]),
    "EXP_649": ("Phồng rộp da do ma sát", [
        "Giày mới cọ gót tạo một bọng nước trong",
        "Đi bộ lâu làm lòng bàn chân phồng và rát khi bước",
        "Cầm xẻng cả buổi khiến lòng bàn tay nổi bóng nước",
        "Da chân bị mép dép chà phồng lên nhưng không có mủ",
        "Bọng ở gót vỡ ra chỉ chảy dịch trong"
    ]),
    "EXP_652": ("Dày sừng nang lông", [
        "Mặt ngoài hai cánh tay có nhiều hạt nhỏ ráp như da gà",
        "Da đùi sần đều quanh từng lỗ chân lông",
        "Trời lạnh tay nổi chấm sần rõ hơn nhưng không đau",
        "Các nốt nhỏ màu da tồn tại lâu và sờ như giấy nhám",
        "Da khô ở cánh tay nổi hạt li ti không lây"
    ])
}

TIER2_ENRICHMENTS = {
    "EXP_153": {
        "aliases": ["Khản tiếng", "Khản tiếng cơ năng"],
        "user_language_variants": [
            "nói nhiều cả ngày xong giọng rè và nhanh hết hơi",
            "sau khi hát lớn gần như mất tiếng nhưng không sốt",
            "dạy học xong giọng đục nghỉ nói thì đỡ"
        ]
    },
    "EXP_566": {
        "aliases": ["Đầy bụng khó tiêu chức năng", "Khó tiêu chức năng"],
        "user_language_variants": [
            "ăn một ít đã no và vùng trên rốn cứ ậm ạch",
            "sau bữa nhiều dầu mỡ đầy bụng và hơi buồn nôn",
            "bụng trên nặng tức hay ợ hơi nhưng không đau dữ"
        ]
    },
    "EXP_351": {
        "aliases": ["Táo bón chức năng", "Khó đi đại tiện"],
        "user_language_variants": [
            "cả tuần chỉ đi ngoài hai lần phân rất khô",
            "đi cầu phải rặn lâu mà vẫn có cảm giác chưa hết",
            "phân vón thành viên nhỏ và bụng dưới hơi chướng"
        ]
    },
    "EXP_603": {
        "aliases": ["Ốm nghén", "Ốm nghén nôn nhiều", "Nôn nghén"],
        "user_language_variants": [
            "mới mang thai buồn nôn buổi sáng và rất sợ mùi cơm",
            "thai kỳ đầu hay nôn khan nhưng vẫn uống nước được",
            "ngửi đồ chiên là cồn cào và muốn ói"
        ]
    },
    "EXP_474": {
        "aliases": ["Đau mắt đỏ", "Viêm kết mạc cấp"],
        "user_language_variants": [
            "sáng dậy hai mí dính ghèn và lòng trắng đỏ",
            "một mắt đỏ cộm rồi hôm sau lây sang mắt kia",
            "mắt đỏ chảy nước và có nhiều dử nhưng thị lực vẫn rõ"
        ]
    }
}


def main() -> None:
    manual_path = ROOT / "data" / "common_diseases_manual.json"
    benchmark_path = ROOT / "data" / "test_cases" / "common_49_validation.json"
    enrichments_path = ROOT / "data" / "tier2_enrichments_manual.json"

    manual = json.loads(manual_path.read_text(encoding="utf-8"))
    replaced = 0
    for index, entry in enumerate(manual):
        replacement = REPLACEMENTS.get(entry["name_vi"])
        if replacement is not None:
            manual[index] = replacement
            replaced += 1
    if replaced not in {0, 5}:
        raise RuntimeError(f"Expected to replace 5 duplicate entries or an already-migrated file, got {replaced}")
    names = {entry["name_vi"] for entry in manual}
    if not {entry["name_vi"] for entry in REPLACEMENTS.values()} <= names:
        raise RuntimeError("Replacement verification failed")

    benchmark = json.loads(benchmark_path.read_text(encoding="utf-8"))
    for disease_id, (name, queries) in VALIDATION_QUERIES.items():
        rows = [row for row in benchmark["cases"] if row["disease_id"] == disease_id]
        if len(rows) != 5:
            raise RuntimeError(f"{disease_id}: expected five validation rows")
        for row, query in zip(rows, queries):
            row["expected_disease"] = name
            row["query"] = query

    manual_path.write_text(json.dumps(manual, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    benchmark_path.write_text(
        json.dumps(benchmark, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    enrichments_path.write_text(
        json.dumps(TIER2_ENRICHMENTS, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Common-49 duplicate migration complete (replaced={replaced}).")


if __name__ == "__main__":
    main()
