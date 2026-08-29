import os
import torch
from datasets import load_dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments
from unsloth import is_bfloat16_supported

def train_medical_model():
    print("1. Đang tải Qwen2.5-7B-Instruct (4-bit quantization)...")
    max_seq_length = 2048 # Độ dài ngữ cảnh
    
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = "unsloth/Qwen2.5-7B-Instruct",
        max_seq_length = max_seq_length,
        dtype = None,
        load_in_4bit = True, # Ép xuống 4-bit để vừa VRAM 16GB
    )

    print("\n2. Cấu hình LoRA Adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r = 16, # Rank
        target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                          "gate_proj", "up_proj", "down_proj",],
        lora_alpha = 16,
        lora_dropout = 0,
        bias = "none",
        use_gradient_checkpointing = "unsloth",
        random_state = 3407,
        use_rslora = False,
        loftq_config = None,
    )

    print("\n3. Tải bộ dữ liệu Medical ShareGPT...")
    dataset = load_dataset("json", data_files={"train": "data/finetune/medical_sharegpt.jsonl"}, split="train")

    # Format theo chuẩn ChatML cho Qwen
    from unsloth.chat_templates import get_chat_template
    tokenizer = get_chat_template(
        tokenizer,
        chat_template = "chatml",
        mapping = {"role": "from", "content": "value", "user": "human", "assistant": "gpt"}
    )

    def formatting_prompts_func(examples):
        convos = examples["conversations"]
        texts = [tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False) for convo in convos]
        return {"text": texts}

    dataset = dataset.map(formatting_prompts_func, batched=True)

    print("\n4. Khởi chạy quá trình Huấn Luyện (Fine-Tuning)...")
    trainer = SFTTrainer(
        model = model,
        tokenizer = tokenizer,
        train_dataset = dataset,
        dataset_text_field = "text",
        max_seq_length = max_seq_length,
        dataset_num_proc = 2,
        args = TrainingArguments(
            per_device_train_batch_size = 2,
            gradient_accumulation_steps = 4,
            warmup_steps = 5,
            max_steps = 600, # Chạy thử 600 steps trước (tăng lên nếu muốn train full)
            learning_rate = 2e-4,
            fp16 = not is_bfloat16_supported(),
            bf16 = is_bfloat16_supported(),
            logging_steps = 10,
            optim = "adamw_8bit",
            weight_decay = 0.01,
            lr_scheduler_type = "linear",
            seed = 3407,
            output_dir = "outputs",
        ),
    )

    trainer_stats = trainer.train()

    print("\n5. Lưu mô hình (LoRA Adapters)...")
    model.save_pretrained("medical_triage_lora")
    tokenizer.save_pretrained("medical_triage_lora")
    print("✅ Hoàn tất! Hãy tải thư mục 'medical_triage_lora' về máy tính của bạn!")

if __name__ == "__main__":
    train_medical_model()
