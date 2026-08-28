import json
from pathlib import Path
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, "src")
from knowledge.schema import DiseaseSchema

diseases_data = [
    # CARDIOLOGY (5 diseases)
    {
        "disease_id": "CARD_002",
        "name_vi": "Tăng huyết áp",
        "name_en": "Hypertension",
        "category": "cardiology",
        "aliases": ["Cao huyết áp", "Tăng áp huyết", "Huyết áp cao"],
        "urgency": "moderate",
        "description": "Tình trạng áp lực máu tác động lên thành động mạch tăng cao mạn tính, thường diễn tiến âm thầm nhưng gây biến chứng nguy hiểm như đột quỵ và nhồi máu cơ tim.",
        "symptoms": {
            "common": [
                {"name_vi": "Đau đầu vùng sau gáy", "name_en": "Occipital headache", "frequency": "common"},
                {"name_vi": "Chóng mặt, hoa mắt", "name_en": "Dizziness, lightheadedness", "frequency": "common"},
                {"name_vi": "Đỏ bừng mặt, hồi hộp", "name_en": "Facial flushing, palpitations", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Ù tai", "name_en": "Tinnitus", "frequency": "occasional"},
                {"name_vi": "Mệt mỏi, mất ngủ", "name_en": "Fatigue, insomnia", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Chảy máu cam", "name_en": "Epistaxis", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Huyết áp đo được trên 180/120 mmHg (cơn tăng huyết áp kịch phát)",
            "Đau đầu dữ dội kèm buồn nôn, nôn vọt",
            "Nhìn mờ đột ngột, lú lẫn, yếu liệt nửa người, nói ngọng (dấu hiệu đột quỵ)",
            "Đau tức ngực dữ dội, khó thở cấp"
        ],
        "risk_factors": ["Cao tuổi", "Ăn mặn", "Béo phì", "Hút thuốc lá", "Uống nhiều rượu bia", "Ít vận động", "Căng thẳng kéo dài", "Tiền sử gia đình"],
        "questions_to_ask": [
            "Gần đây bạn có đo huyết áp không, chỉ số huyết áp cao nhất là bao nhiêu?",
            "Cơn đau đầu thường xuất hiện vào lúc nào (buổi sáng, sau gáy hay đỉnh đầu)?",
            "Bạn có cảm thấy tức ngực, khó thở hoặc nhìn mờ, tê bì chân tay không?"
        ],
        "differential_diagnoses": ["Đau đầu căng thẳng", "Rối loạn tiền đình", "U tủy thượng thận"],
        "when_to_seek_emergency": [
            "Huyết áp >= 180/120 mmHg",
            "Kèm đau thắt ngực dữ dội, khó thở hoặc dấu hiệu đột quỵ (yếu nửa người, méo miệng)"
        ],
        "user_language_variants": [
            "huyết áp tôi lúc nào cũng cao vút",
            "đau đầu sau gáy buốt lên đỉnh đầu",
            "nóng bừng mặt chóng mặt đo thấy 150",
            "hay bị hoa mắt chóng mặt đo huyết áp lên cao",
            "mặt đỏ phừng phừng đầu váng vất"
        ]
    },
    {
        "disease_id": "CARD_003",
        "name_vi": "Suy tim",
        "name_en": "Heart Failure",
        "category": "cardiology",
        "aliases": ["Suy tim mạn", "Suy tim ứ huyết"],
        "urgency": "high",
        "description": "Tình trạng cơ tim suy yếu, không thể bơm đủ máu đáp ứng nhu cầu trao đổi chất của cơ thể, dẫn đến ứ trệ tuần hoàn phổi và ngoại biên.",
        "symptoms": {
            "common": [
                {"name_vi": "Khó thở khi gắng sức", "name_en": "Exertional dyspnea", "frequency": "common"},
                {"name_vi": "Khó thở khi nằm đầu thấp, phải ngồi dậy để thở", "name_en": "Orthopnea", "frequency": "common"},
                {"name_vi": "Phù hai chi dưới (phù mắt cá chân, mu bàn chân)", "name_en": "Lower extremity edema", "frequency": "common"},
                {"name_vi": "Mệt mỏi kiệt sức nhanh chóng khi làm việc nhẹ", "name_en": "Severe fatigue", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Ho khan dai dẳng vào ban đêm", "name_en": "Nocturnal dry cough", "frequency": "occasional"},
                {"name_vi": "Tăng cân nhanh không rõ nguyên nhân do giữ nước", "name_en": "Rapid fluid weight gain", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Chán ăn, đầy bụng do ứ huyết gan ruột", "name_en": "Abdominal fullness, anorexia", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Khó thở kịch phát dữ dội về đêm kèm ho khạc bọt hồng (phù phổi cấp)",
            "Đau ngực dữ dội, tụt huyết áp, vã mồ hôi, da tái lạnh",
            "Ngất xỉu, mất ý thức đột ngột"
        ],
        "risk_factors": ["Tiền sử nhồi máu cơ tim", "Tăng huyết áp lâu năm", "Bệnh van tim", "Bệnh cơ tim", "Đái tháo đường"],
        "questions_to_ask": [
            "Bạn có bị khó thở tăng lên khi nằm phẳng và phải kê nhiều gối để ngủ không?",
            "Hai chân, mắt cá chân của bạn có bị sưng phù, ấn vào để lại vết lõm không?",
            "Bạn đi bộ hoặc leo cầu thang có bị hụt hơi, thở dốc bất thường không?"
        ],
        "differential_diagnoses": ["Bệnh phổi tắc nghẽn mạn tính (COPD)", "Hen suyễn", "Suy thận mạn", "Xơ gan cổ trướng"],
        "when_to_seek_emergency": [
            "Khó thở đột ngột dữ dội, tím tái môi đầu chi",
            "Ho khạc ra bọt màu hồng, không thể nằm thở được"
        ],
        "user_language_variants": [
            "nằm xuống là ngộp thở không thở được phải ngồi dậy",
            "chân sưng phù mắt cá ấn vào lõm",
            "leo cầu thang 1 tầng là thở dốc tim đập thình thịch",
            "khó thở đêm đang ngủ phải bật dậy thở gấp",
            "người mệt lả đi vài bước là hụt hơi chân phù"
        ]
    },
    {
        "disease_id": "CARD_004",
        "name_vi": "Rối loạn nhịp tim",
        "name_en": "Cardiac Arrhythmia",
        "category": "cardiology",
        "aliases": ["Loạn nhịp tim", "Tim đập nhanh", "Hồi hộp đánh trống ngực"],
        "urgency": "moderate_to_high",
        "description": "Tình trạng bất thường trong hệ thống dẫn truyền điện tim khiến tim đập quá nhanh, quá chậm hoặc không đều.",
        "symptoms": {
            "common": [
                {"name_vi": "Cảm giác hồi hộp, đánh trống ngực liên hồi", "name_en": "Palpitations", "frequency": "common"},
                {"name_vi": "Cảm giác tim bỏ nhịp hoặc đập lỗi nhịp", "name_en": "Skipped heartbeats", "frequency": "common"},
                {"name_vi": "Chóng mặt, lảo đảo", "name_en": "Lightheadedness", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Cảm giác hụt hơi, tức nhẹ ở ngực", "name_en": "Shortness of breath, chest discomfort", "frequency": "occasional"},
                {"name_vi": "Mệt mỏi suy nhược", "name_en": "Fatigue", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Choáng váng gần ngất", "name_en": "Presyncope", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Ngất xỉu hoặc mất ý thức đột ngột",
            "Tim đập dồn dập kèm đau thắt ngực dữ dội, khó thở trầm trọng",
            "Mạch đập rất nhanh trên 150 lần/phút hoặc rất chậm dưới 45 lần/phút kèm tụt huyết áp"
        ],
        "risk_factors": ["Bệnh mạch vành", "Cường giáp", "Dùng nhiều chất kích thích (cà phê, trà, rượu bia, thuốc lá)", "Rối loạn điện giải", "Căng thẳng"],
        "questions_to_ask": [
            "Cơn hồi hộp tim đập nhanh xuất hiện từng cơn hay liên tục, kéo dài bao lâu?",
            "Bạn cảm thấy tim đập nhanh dồn dập hay tim đập loạn nhịp, bỏ nhịp?",
            "Khi cơn xuất hiện bạn có bị hoa mắt, xây xẩm mặt mày hoặc ngất xỉu không?"
        ],
        "differential_diagnoses": ["Cơn hoảng loạn (Panic attack)", "Cường giáp Basedow", "Thiếu máu", "Rối loạn thần kinh thực vật"],
        "when_to_seek_emergency": [
            "Ngất xỉu, mất ý thức",
            "Tim đập nhanh dồn dập kèm đau ngực thắt nghẹt, vã mồ hôi, tụt huyết áp"
        ],
        "user_language_variants": [
            "tim đập thình thịch như muốn nhảy ra ngoài lồng ngực",
            "tự nhiên tim đập loạn xạ hẫng một nhịp",
            "hồi hộp đánh trống ngực liên tục váng đầu",
            "ngực hẫng một cái xong tim đập nhanh vù vù",
            "ngồi yên mà tim đập 120 nhịp thở không kịp"
        ]
    },
    {
        "disease_id": "CARD_005",
        "name_vi": "Huyết áp thấp",
        "name_en": "Hypotension",
        "category": "cardiology",
        "aliases": ["Tụt huyết áp", "Hạ huyết áp tư thế"],
        "urgency": "moderate",
        "description": "Tình trạng huyết áp tâm thu dưới 90 mmHg hoặc huyết áp tâm trương dưới 60 mmHg, làm giảm lưu lượng máu nuôi não và các cơ quan.",
        "symptoms": {
            "common": [
                {"name_vi": "Chóng mặt, hoa mắt khi đứng dậy đột ngột", "name_en": "Orthostatic dizziness", "frequency": "common"},
                {"name_vi": "Xây xẩm mặt mày, mắt tối sầm lại", "name_en": "Blurred vision, blacking out", "frequency": "common"},
                {"name_vi": "Mệt mỏi rã rời, buồn ngủ ban ngày", "name_en": "Fatigue, lethargy", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Buồn nôn, toát mồ hôi lạnh", "name_en": "Nausea, cold sweats", "frequency": "occasional"},
                {"name_vi": "Khó tập trung, suy giảm trí nhớ tạm thời", "name_en": "Poor concentration", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Ngất xỉu thoáng qua", "name_en": "Syncope", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Huyết áp tụt sâu kèm mạch nhanh nhỏ khó bắt, da tái lạnh vã mồ hôi (dấu hiệu sốc)",
            "Chấn thương nặng do ngất ngã",
            "Nôn ra máu hoặc đi ngoài phân đen kèm tụt huyết áp (xuất huyết tiêu hóa cấp)"
        ],
        "risk_factors": ["Thiếu nước, mất máu", "Suy dinh dưỡng, thiếu máu", "Phụ nữ mang thai", "Nằm bất động lâu ngày", "Tác dụng phụ thuốc huyết áp"],
        "questions_to_ask": [
            "Bạn bị chóng mặt nhiều nhất khi đang ngồi/nằm rồi đứng dậy nhanh phải không?",
            "Chỉ số huyết áp gần nhất đo được là bao nhiêu?",
            "Bạn có bị nôn ói, tiêu chảy mất nước hay chảy máu ở đâu gần đây không?"
        ],
        "differential_diagnoses": ["Rối loạn tiền đình", "Thiếu máu", "Hạ đường huyết", "Thiếu nước cấp"],
        "when_to_seek_emergency": [
            "Tụt huyết áp kèm ngất lịm, da tái lạnh, mạch đập yếu ớt",
            "Nghi ngờ mất máu cấp hoặc sốc nhiễm trùng"
        ],
        "user_language_variants": [
            "đang ngồi đứng dậy là tối sầm mặt mày lảo đảo",
            "người yếu lả toát mồ hôi lạnh đo huyết áp có 85 trên 55",
            "xây xẩm mặt mày muốn ngã gục khi đứng lên",
            "tụt huyết áp người mệt lử run tay chân",
            "hoa mắt chóng mặt đầu óc quay cuồng đo thấy tụt áp"
        ]
    },
    {
        "disease_id": "CARD_006",
        "name_vi": "Viêm cơ tim",
        "name_en": "Myocarditis",
        "category": "cardiology",
        "aliases": ["Viêm cơ tim cấp", "Nhiễm trùng cơ tim"],
        "urgency": "emergency",
        "description": "Tình trạng viêm nhiễm và hoại tử tế bào cơ tim, thường do nhiễm virus (sau cảm cúm, sốt siêu vi) hoặc tự miễn, có thể gây suy tim cấp và tử vong nhanh.",
        "symptoms": {
            "common": [
                {"name_vi": "Đau tức ngực âm ỉ hoặc nhói buốt sau đợt sốt cảm cúm", "name_en": "Chest pain post-viral infection", "frequency": "common"},
                {"name_vi": "Khó thở khi nằm hoặc khi hoạt động nhẹ", "name_en": "Dyspnea", "frequency": "common"},
                {"name_vi": "Mệt mỏi kiệt sức bất thường sau sốt", "name_en": "Profound fatigue post-febrile", "frequency": "common"},
                {"name_vi": "Hồi hộp, tim đập nhanh không tương xứng với thân nhiệt", "name_en": "Inappropriate tachycardia", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Sốt nhẹ kéo dài, đau mỏi toàn thân", "name_en": "Low-grade fever, myalgia", "frequency": "occasional"},
                {"name_vi": "Phù hai chân nhẹ", "name_en": "Mild peripheral edema", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Ngất xỉu do loạn nhịp thất nguy hiểm", "name_en": "Arrhythmic syncope", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Đau ngực dữ dội kèm khó thở tiến triển nhanh chóng",
            "Huyết áp tụt kẹp, mạch nhanh nhỏ, đầu chi lạnh ngắt (sốc tim)",
            "Ngất lịm, rối loạn ý thức, trụy mạch sau đợt sốt siêu vi"
        ],
        "risk_factors": ["Vừa trải qua đợt nhiễm virus (Coxsackie, cúm, COVID-19, Adenovirus)", "Nhiễm khuẩn", "Bệnh tự miễn"],
        "questions_to_ask": [
            "Cách đây 1-2 tuần bạn có bị sốt siêu vi, cảm cúm hoặc viêm đường hô hấp không?",
            "Cơn đau tức ngực và khó thở xuất hiện từ khi nào, có tăng lên khi hít sâu hoặc nằm ngửa không?",
            "Bạn có thấy tim đập dồn dập, đập nhanh bất thường dù đang nằm nghỉ không?"
        ],
        "differential_diagnoses": ["Nhồi máu cơ tim cấp", "Viêm màng ngoài tim", "Tràn dịch màng phổi", "Cơn đau thắt ngực không ổn định"],
        "when_to_seek_emergency": [
            "Khó thở dữ dội, đau tức ngực sau đợt sốt cảm cúm",
            "Ngất xỉu, tụt huyết áp, mạch nhanh nhỏ, da tím tái"
        ],
        "user_language_variants": [
            "vừa hết sốt cảm cúm xong giờ tức ngực khó thở quá",
            "hết cảm mà tim cứ đập nhanh mệt lả không thở nổi",
            "đau ngực mệt rũ rượi sau đợt sốt siêu vi",
            "ngực đau nhói khó thở người tái nhợt sau khi bị cúm",
            "tim đập loạn xạ mệt ngất ngây sau trận ốm sốt"
        ]
    },

    # DERMATOLOGY (6 diseases)
    {
        "disease_id": "DERM_001",
        "name_vi": "Nấm da",
        "name_en": "Tinea / Dermatophytosis",
        "category": "dermatology",
        "aliases": ["Hắc lào", "Lác đồng tiền", "Nấm da toàn thân", "Nấm bẹn"],
        "urgency": "low",
        "description": "Bệnh nhiễm trùng da do vi nấm sợi nông gây ra, tạo thành các tổn thương hình tròn hoặc bầu dục có bờ viền đỏ rõ rệt, mụn nước nhỏ li ti và rất ngứa.",
        "symptoms": {
            "common": [
                {"name_vi": "Ngứa da dữ dội, đặc biệt khi ra mồ hôi hoặc thời tiết nóng ẩm", "name_en": "Intense pruritus with sweating", "frequency": "common"},
                {"name_vi": "Vết ban đỏ hình tròn hoặc bầu dục giống đồng xu có bờ viền nổi gờ", "name_en": "Annular red plaque with raised active border", "frequency": "common"},
                {"name_vi": "Mụn nước nhỏ li ti ở rìa tổn thương", "name_en": "Marginal vesicles", "frequency": "common"},
                {"name_vi": "Trung tâm tổn thương có xu hướng lành dần, da hơi thâm sạm và có vảy mịn", "name_en": "Central clearing with fine scaling", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Tổn thương lan rộng ra vùng bẹn, mông, đùi hoặc kẽ ngón chân", "name_en": "Lesions spreading to groin, thighs, interdigital spaces", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Bội nhiễm vi khuẩn làm mụn nước hóa mủ, sưng nóng đỏ đau", "name_en": "Secondary bacterial infection with pustules", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Vùng da tổn thương sưng nề to, chảy mủ vàng hôi kèm sốt cao (nhiễm trùng mô bào)",
            "Vết nấm lan tỏa toàn thân ở người suy giảm miễn dịch hoặc đái tháo đường nặng"
        ],
        "risk_factors": ["Khí hậu nóng ẩm", "Mặc quần áo chật, ẩm ướt", "Dùng chung khăn mặt, quần áo với người bệnh", "Vệ sinh kém", "Tiếp xúc thú cưng bị nấm"],
        "questions_to_ask": [
            "Vết đỏ trên da có hình tròn giống đồng xu với viền ngoài nổi cộm và ngứa nhiều không?",
            "Vết tổn thương xuất hiện ở vị trí nào (bẹn, mông, nách, lưng hay kẽ chân)?",
            "Vùng da đó có đang bị chảy dịch mủ vàng hay đau nhức nhiều không?"
        ],
        "differential_diagnoses": ["Vẩy nến thể mảng", "Chàm đồng tiền (Nummular eczema)", "Vẩy phấn hồng Gibert", "Viêm da tiếp xúc"],
        "when_to_seek_emergency": [
            "Vết loét da lan rộng kèm sưng đỏ nóng rát dữ dội, sốt cao rét run (nguy cơ viêm mô tế bào hoại tử)"
        ],
        "user_language_variants": [
            "da nổi vết tròn tròn như đồng xu ngứa điên cuồng",
            "bị hắc lào ngứa ở bẹn nổi mụn nước li ti",
            "vết lác đồng tiền ở lưng viền đỏ viền mụn nước ngứa ngáy",
            "ngứa kẽ bẹn nổi vòng đỏ rát khi ra mồ hôi",
            "da nổi mảng đỏ hình tròn ngứa gãi trầy xước"
        ]
    },
    {
        "disease_id": "DERM_002",
        "name_vi": "Chàm (Viêm da cơ địa)",
        "name_en": "Eczema / Atopic Dermatitis",
        "category": "dermatology",
        "aliases": ["Viêm da dị ứng", "Lác sữa (ở trẻ nhỏ)", "Eczema"],
        "urgency": "low",
        "description": "Bệnh da viêm mạn tính tái phát nhiều lần, đặc trưng bởi tình trạng ngứa dữ dội, da khô nứt nẻ, đỏ da, có mụn nước và lichen hóa (da dày hằn cộm).",
        "symptoms": {
            "common": [
                {"name_vi": "Ngứa da dữ dội từng cơn, tăng nặng về đêm", "name_en": "Severe pruritus, worse at night", "frequency": "common"},
                {"name_vi": "Da khô ráp, bong tróc vảy nứt nẻ", "name_en": "Xerosis and scaling", "frequency": "common"},
                {"name_vi": "Mảng da đỏ sần sùi ở các nếp gấp (khuỷu tay, khoeo chân, cổ)", "name_en": "Erythematous plaques on flexural creases", "frequency": "common"},
                {"name_vi": "Mụn nước nhỏ tập trung thành đám, dễ vỡ chảy dịch", "name_en": "Vesicles on erythematous base with oozing", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Da dày sừng cộm hằn rãnh sâu do gãi nhiều (Lichen hóa)", "name_en": "Lichenification from chronic scratching", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Nhiễm trùng thứ phát gây đóng vảy tiết vàng mật ong (chốc hóa)", "name_en": "Impetiginization with honey-colored crusts", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Tổn thương da lở loét rộng, sốt cao, nổi mụn nước toàn thân dạng Herpes (Eczema herpeticum)",
            "Chảy mủ ồ ạt, sưng hạch bạch huyết lân cận kèm sốt rét run"
        ],
        "risk_factors": ["Cơ địa dị ứng (viêm mũi dị ứng, hen suyễn)", "Tiền sử gia đình mắc bệnh atopy", "Thời tiết hanh khô mùa đông", "Tiếp xúc xà phòng, hóa chất"],
        "questions_to_ask": [
            "Tình trạng ngứa và khô da này có tái đi tái lại nhiều đợt từ trước đến nay không?",
            "Vết chàm tập trung ở nếp gấp khuỷu tay, khoeo chân hay trên mặt, bàn tay?",
            "Bạn hoặc người nhà có tiền sử bị viêm mũi dị ứng, hen phế quản không?"
        ],
        "differential_diagnoses": ["Viêm da tiếp xúc dị ứng", "Vẩy nến", "Nấm da", "Viêm da dầu (tiết bã)"],
        "when_to_seek_emergency": [
            "Nổi mụn nước mủ rộ toàn thân kèm sốt cao (Eczema herpeticum - biến chứng cấp tính nguy hiểm)"
        ],
        "user_language_variants": [
            "da khô nứt nẻ ngứa ngáy điên cuồng về đêm",
            "bị chàm ở khuỷu tay khoeo chân gãi đến bật máu",
            "viêm da cơ địa da tróc vảy dày cộm ngứa rát",
            "nổi mẩn đỏ ngứa chảy nước ở mu bàn tay",
            "da tay nứt toác ngứa rát bong từng mảng vào mùa đông"
        ]
    },
    {
        "disease_id": "DERM_003",
        "name_vi": "Mụn trứng cá",
        "name_en": "Acne Vulgaris",
        "category": "dermatology",
        "aliases": ["Mụn viêm", "Mụn bọc", "Mụn đầu đen", "Mụn mủ"],
        "urgency": "low",
        "description": "Bệnh lý viêm nang lông tuyến bã mạn tính, phổ biến ở tuổi dậy thì và thanh thiếu niên, biểu hiện qua mụn đầu đen, đầu trắng, mụn sẩn đỏ, mụn mủ hoặc nang bọc.",
        "symptoms": {
            "common": [
                {"name_vi": "Nhân mụn đầu đen hoặc đầu trắng (mụn không viêm)", "name_en": "Open and closed comedones", "frequency": "common"},
                {"name_vi": "Sẩn đỏ, mụn mủ sưng đau ở mặt, ngực, lưng", "name_en": "Inflammatory papules and pustules", "frequency": "common"},
                {"name_vi": "Da tăng tiết nhiều dầu nhờn, lỗ chân lông to", "name_en": "Oily skin / seborrhea", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Mụn bọc, mụn nang to sâu dưới da, đau nhức nhiều", "name_en": "Nodules and cysts", "frequency": "occasional"},
                {"name_vi": "Thâm đỏ hoặc sẹo lõm/lồi sau khi mụn lành", "name_en": "Post-inflammatory erythema, scarring", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Mụn trứng cá bùng phát cấp tính kèm sốt đau khớp (Acne fulminans)", "name_en": "Acne fulminans with systemic symptoms", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Mụn sưng to vùng 'tam giác chết' quanh mũi môi kèm sưng mắt, đau đầu dữ dội, sốt cao (nguy cơ viêm tắc xoang tĩnh mạch hang)",
            "Nhiễm trùng nang lông lan rộng tạo thành ổ áp xe lớn hoại tử da"
        ],
        "risk_factors": ["Rối loạn nội tiết tuổi dậy thì hoặc chu kỳ kinh nguyệt", "Tuyến bã nhờn hoạt động quá mức", "Vi khuẩn C. acnes", "Stress", "Dùng mỹ phẩm bít tắc lỗ chân lông"],
        "questions_to_ask": [
            "Mụn chủ yếu là mụn ẩn đầu đen hay mụn sưng đỏ, có mủ đau nhức?",
            "Mụn xuất hiện tập trung ở vị trí nào (mặt, trán, cằm, lưng hay ngực)?",
            "Bạn có đang dùng loại kem bôi, mỹ phẩm hoặc thuốc chứa corticoid nào không?"
        ],
        "differential_diagnoses": ["Viêm nang lông (Folliculitis)", "Trứng cá đỏ (Rosacea)", "Viêm da quanh miệng"],
        "when_to_seek_emergency": [
            "Mụn ở vùng mũi má sưng tấy dữ dội kèm sốt cao, đau nhức mắt, nhìn đôi (nghi ngờ nhiễm trùng lan vào nội sọ)"
        ],
        "user_language_variants": [
            "mặt nổi đầy mụn bọc sưng đỏ đau nhức",
            "mụn trứng cá mụn mủ chi chít ở mặt và lưng",
            "mụn đầu đen lỗ chân lông to da đổ dầu nhiều",
            "mụn ẩn mụn viêm mọc tùm lum ở cằm và trán",
            "nổi mụn sưng to không có cồi đau rát cả mặt"
        ]
    },
    {
        "disease_id": "DERM_004",
        "name_vi": "Vẩy nến",
        "name_en": "Psoriasis",
        "category": "dermatology",
        "aliases": ["Vảy nến", "Vẩy nến thể mảng", "Bệnh vảy nến"],
        "urgency": "moderate",
        "description": "Bệnh da viêm mạn tính qua trung gian miễn dịch, đặc trưng bởi các mảng đỏ giới hạn rõ, phủ nhiều lớp vảy trắng bạc như sáp nến, dễ cạo bong vảy (dấu hiệu Brocq).",
        "symptoms": {
            "common": [
                {"name_vi": "Mảng da đỏ tươi, giới hạn rất rõ với da lành", "name_en": "Erythematous plaques with sharp demarcation", "frequency": "common"},
                {"name_vi": "Vảy trắng bạc dày nhiều lớp phủ trên bề mặt mảng đỏ", "name_en": "Silvery-white micaceous scales", "frequency": "common"},
                {"name_vi": "Tổn thương hay gặp ở vùng tì đè (khuỷu tay, đầu gối, da đầu, vùng thắt lưng)", "name_en": "Lesions on extensor surfaces (elbows, knees, scalp)", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Ngứa nhẹ đến vừa tại vùng tổn thương", "name_en": "Mild to moderate itching", "frequency": "occasional"},
                {"name_vi": "Móng tay/chân bị rỗ lỗ chỗ, dày sừng dưới móng, đổi màu vàng nâu", "name_en": "Nail pitting, onycholysis, oil drop sign", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Đau nhức, sưng các khớp ngón tay ngón chân (Viêm khớp vẩy nến)", "name_en": "Psoriatic arthritis with joint swelling", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Đỏ da toàn thân tróc vảy trên 90% diện tích cơ thể kèm sốt cao, rối loạn thân nhiệt (Vẩy nến đỏ da toàn thân)",
            "Nổi mụn mủ vô trùng khắp cơ thể trên nền da đỏ rát dữ dội kèm sốt cao (Vẩy nến thể mủ cấp tính Von Zumbusch)"
        ],
        "risk_factors": ["Yếu tố di truyền", "Stress tâm lý", "Chấn thương da cơ học (hiện tượng Koebner)", "Nhiễm trùng liên cầu khuẩn", "Thuốc lá, rượu bia"],
        "questions_to_ask": [
            "Các mảng đỏ có phủ lớp vảy trắng bạc dễ cạo bong như sáp nến không?",
            "Vết vảy nến xuất hiện ở đầu gối, khuỷu tay hay trên da đầu, móng tay?",
            "Bạn có bị đau nhức hay sưng các khớp ngón tay, ngón chân kèm theo không?"
        ],
        "differential_diagnoses": ["Chàm thể mảng", "Nấm da toàn thân", "Viêm da dầu", "Liken phẳng"],
        "when_to_seek_emergency": [
            "Đỏ da toàn thân tróc vảy dữ dội kèm rét run, sốt cao, kiệt sức",
            "Nổi bùng phát hàng loạt mụn mủ khắp cơ thể (Vẩy nến thể mủ)"
        ],
        "user_language_variants": [
            "da nổi mảng đỏ phủ vảy trắng bạc như sáp nến",
            "bị vẩy nến ở khuỷu tay đầu gối tróc vảy trắng",
            "da đầu đóng mảng dày vảy trắng rụng như gàu tuyết",
            "móng tay bị rỗ lỗ chỗ da đầu gối nổi mảng đỏ cộm vảy",
            "vảy nến tróc từng lớp vảy màu bạc cạo ra giọt máu nhỏ"
        ]
    },
    {
        "disease_id": "DERM_005",
        "name_vi": "Mề đay",
        "name_en": "Urticaria",
        "category": "dermatology",
        "aliases": ["Mày đay", "Phong ngứa", "Dị ứng mề đay", "Nổi mày đay cấp"],
        "urgency": "moderate",
        "description": "Phản ứng phù cấp hoặc mạn ở trung bì da do giải phóng histamin, biểu hiện bằng các sẩn phù phù nề màu hồng/đỏ, rất ngứa, xuất hiện nhanh và lặn không để lại dấu vết trong 24 giờ.",
        "symptoms": {
            "common": [
                {"name_vi": "Nổi các sẩn phù, mảng gồ trên mặt da màu hồng đỏ hoặc trắng ở giữa", "name_en": "Wheals / urticarial plaques", "frequency": "common"},
                {"name_vi": "Ngứa da dữ dội, cảm giác châm chích nóng rát", "name_en": "Intense pruritus and stinging", "frequency": "common"},
                {"name_vi": "Các nốt phù nổi nhanh khắp người và lặn đi trong vòng vài giờ đến dưới 24h", "name_en": "Transient lesions disappearing within 24h", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Phù mạch (Angioedema): sưng to mí mắt, môi, tai, mu bàn tay bàn chân", "name_en": "Angioedema of eyelids, lips, extremities", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Đau bụng quặn, buồn nôn hoặc đi ngoài do phù niêm mạc ruột", "name_en": "Abdominal cramping from intestinal edema", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Sưng nề to vùng môi lưỡi, họng, cảm giác nghẹn cổ họng, khó thở rít (phù nề thanh quản - Dấu hiệu Sốc phản vệ)",
            "Chóng mặt dữ dội, tụt huyết áp, vã mồ hôi, ngất xỉu sau khi tiếp xúc dị nguyên",
            "Khó thở cấp kèm thở khò khè sau khi ăn hải sản, uống thuốc hoặc bị ong đốt"
        ],
        "risk_factors": ["Dị ứng thức ăn (hải sản, trứng, đậu phộng)", "Dị ứng thuốc (kháng sinh, NSAIDs)", "Côn trùng đốt", "Nhiễm virus", "Thay đổi nhiệt độ nóng lạnh đột ngột", "Căng thẳng"],
        "questions_to_ask": [
            "Các nốt mẩn ngứa này có tự lặn đi sau vài tiếng rồi lại mọc ở chỗ khác không?",
            "Trước khi nổi mề đay bạn có ăn đồ lạ (hải sản, nhộng...), uống thuốc gì hoặc bị côn trùng đốt không?",
            "Bạn có cảm thấy khó thở, tức ngực, nghẹn ở cổ họng hoặc sưng vù môi mắt không?"
        ],
        "differential_diagnoses": ["Phù mạch di truyền", "Viêm mạch mề đay", "Hồng ban đa dạng", "Viêm da tiếp xúc"],
        "when_to_seek_emergency": [
            "Sưng môi, sưng lưỡi, nghẹn họng, thở rít khó thở (Sốc phản vệ nguy hiểm tính mạng)",
            "Chóng mặt, tụt huyết áp, ngất xỉu sau khi nổi mẩn"
        ],
        "user_language_variants": [
            "người nổi mẩn đỏ từng cục ngứa phát điên",
            "nổi mề đay phù mảng mảng khắp người ngứa rát",
            "ăn hải sản xong nổi mảng phong ngứa sưng vù môi",
            "da nổi cục phù to ngứa gãi đến đâu nổi đến đó",
            "nổi mày đay ngứa như kim châm lặn chỗ này mọc chỗ khác"
        ]
    },
    {
        "disease_id": "DERM_006",
        "name_vi": "Zona thần kinh",
        "name_en": "Herpes Zoster / Shingles",
        "category": "dermatology",
        "aliases": ["Bệnh Zona", "Giời leo", "Thần kinh Zona"],
        "urgency": "moderate_to_high",
        "description": "Bệnh nhiễm trùng cấp tính do sự tái hoạt động của virus Varicella-Zoster (virus thủy đậu) tiềm ẩn trong hạch thần kinh cảm giác, biểu hiện bằng chùm mụn nước mọc dọc theo một bên dây thần kinh kèm đau rát dữ dội.",
        "symptoms": {
            "common": [
                {"name_vi": "Đau rát bỏng buốt dữ dội hoặc châm chích như kim châm tại một bên cơ thể", "name_en": "Severe burning neuropathic pain localized unilaterally", "frequency": "common"},
                {"name_vi": "Chùm mụn nước căng trên nền da đỏ mọc dọc theo đường đi dây thần kinh (chỉ ở 1 bên cơ thể)", "name_en": "Clustered vesicles on erythematous base along dermatome", "frequency": "common"},
                {"name_vi": "Tăng cảm giác đau, chỉ cần chạm nhẹ vào áo quần cũng đau nhói", "name_en": "Allodynia and hyperesthesia", "frequency": "common"}
            ],
            "occasional": [
                {"name_vi": "Sốt nhẹ, mệt mỏi, đau đầu trước khi mụn nước phát ban", "name_en": "Prodromal low-grade fever, malaise, headache", "frequency": "occasional"},
                {"name_vi": "Nổi hạch sưng đau ở vùng lân cận (hạch cổ, nách, bẹn)", "name_en": "Regional lymphadenopathy", "frequency": "occasional"}
            ],
            "rare": [
                {"name_vi": "Đau dây thần kinh sau Zona kéo dài nhiều tháng nhiều năm (PHN)", "name_en": "Postherpetic neuralgia", "frequency": "rare"}
            ]
        },
        "red_flags": [
            "Mụn nước mọc ở vùng trán, quanh mắt và đỉnh chóp mũi (dấu hiệu Hutchinson - Zona mắt đe dọa mù lòa)",
            "Mụn nước ở tai kèm liệt một bên mặt, chóng mặt, ù tai, mất thính lực (Hội chứng Ramsay Hunt)",
            "Zona lan tỏa khắp toàn thân ở bệnh nhân suy giảm miễn dịch nặng"
        ],
        "risk_factors": ["Tiền sử đã từng bị thủy đậu", "Người lớn tuổi trên 50", "Suy giảm miễn dịch (ung thư, HIV, dùng corticoid kéo dài)", "Căng thẳng kiệt sức"],
        "questions_to_ask": [
            "Cơn đau rát và mụn nước có chỉ xuất hiện ở một bên cơ thể (một bên sườn, một bên mặt...) không vượt qua đường giữa người?",
            "Trước khi nổi mụn nước bạn có cảm giác đau rát bỏng buốt ở vùng da đó trước vài ngày không?",
            "Vết zona có mọc gần mắt, trán hoặc tai không?"
        ],
        "differential_diagnoses": ["Herpes simplex (HSV)", "Viêm da tiếp xúc do côn trùng (kiến ba khoang)", "Đau thắt ngực (nếu Zona ở ngực trái)", "Viêm ruột thừa (nếu Zona ở bụng phải)"],
        "when_to_seek_emergency": [
            "Zona ở vùng mắt, mũi, trán có nguy cơ gây mù lòa",
            "Zona ở tai kèm liệt mặt, chóng mặt dữ dội (Hội chứng Ramsay Hunt)"
        ],
        "user_language_variants": [
            "bị giời leo đau rát như bị bỏng lửa ở một bên mạn sườn",
            "nổi chùm mụn nước một bên lưng đau buốt thấu xương",
            "da đau rát chạm áo vào cũng đau nhói nổi bọng nước một bên người",
            "bị zona ở mặt đau nhức buốt mắt rát bỏng",
            "nổi dải mụn nước ngứa rát dọc một bên sườn đau như kim châm"
        ]
    }
]

def save_all():
    print("[*] Dang luu cac benh moi vao Knowledge Base...")
    for d_dict in diseases_data:
        validated = DiseaseSchema(**d_dict)
        
        cat = validated.category
        out_dir = Path(f"data/diseases/{cat}")
        out_dir.mkdir(parents=True, exist_ok=True)
        
        import unicodedata, re
        safe_name = unicodedata.normalize('NFKD', validated.name_vi).encode('ASCII', 'ignore').decode('utf-8')
        safe_name = re.sub(r'[^\w\s-]', '', safe_name).strip().lower()
        safe_name = re.sub(r'[-\s]+', '_', safe_name)
        
        out_file = out_dir / f"{safe_name}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(validated.model_dump(), f, ensure_ascii=False, indent=2)
        print(f"[OK] Da luu {validated.name_vi} -> {out_file}")

if __name__ == "__main__":
    save_all()
