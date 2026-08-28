import os
import json
from datasets import load_dataset
from tqdm import tqdm

def prepare_finetune_data():
    output_dir = "data/finetune"
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "medical_sharegpt.jsonl")

    all_data = []

    print("1. Đang tải bộ dữ liệu 'hungsvdut2k2/vietnamese-medical-chat-data' (10K-100K ca)...")
    dataset1 = load_dataset("hungsvdut2k2/vietnamese-medical-chat-data", split="train")
    
    for row in tqdm(dataset1, desc="Format Dataset 1"):
        # Format hiện tại: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        conv_in = row["conversation"]
        conv_out = []
        for msg in conv_in:
            role = "human" if msg["role"] == "user" else "gpt"
            conv_out.append({
                "from": role,
                "value": msg["content"]
            })
        if len(conv_out) > 0:
            all_data.append({"conversations": conv_out, "source": "vietnamese-medical-chat-data"})

    print("\n2. Đang tải bộ dữ liệu 'hungnm/vietnamese-medical-qa' (Hỏi - Đáp Y Tế)...")
    try:
        dataset2 = load_dataset("hungnm/vietnamese-medical-qa", split="train")
        for row in tqdm(dataset2, desc="Format Dataset 2"):
            # Format hiện tại: {"question": "...", "answer": "..."}
            q = row.get("question", "").strip()
            a = row.get("answer", "").strip()
            if q and a:
                conv_out = [
                    {"from": "human", "value": q},
                    {"from": "gpt", "value": a}
                ]
                all_data.append({"conversations": conv_out, "source": "vietnamese-medical-qa"})
    except Exception as e:
        print(f"Bỏ qua dataset 2 do lỗi mạng/truy cập: {e}")

    print(f"\n3. Ghi tổng cộng {len(all_data)} ca lâm sàng vào file ShareGPT JSONL...")
    with open(output_file, "w", encoding="utf-8") as f:
        for item in all_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"\n[HOÀN TẤT] File dữ liệu Fine-tune đã sẵn sàng tại: {output_file}")
    print(f"Tổng số ca bệnh: {len(all_data)}")
    print("Sẵn sàng cho Unsloth / Axolotl Fine-Tuning!")

if __name__ == "__main__":
    prepare_finetune_data()
