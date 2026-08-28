import os
import subprocess

diseases = {
    'respiratory': ['Viêm phổi', 'Hen suyễn', 'Viêm phế quản', 'COPD', 'Viêm xoang', 'Lao phổi'],
    'digestive': ['Viêm dạ dày', 'Trào ngược dạ dày', 'Viêm ruột thừa', 'Hội chứng ruột kích thích', 'Sỏi mật', 'Viêm gan B'],
    'general': ['Cảm cúm', 'Sốt xuất huyết', 'COVID-19', 'Thiếu máu', 'Tiểu đường type 2', 'Nhiễm trùng đường tiết niệu'],
    'dermatology': ['Nấm da', 'Chàm', 'Mụn trứng cá', 'Vẩy nến', 'Mề đay', 'Zona thần kinh'],
    'cardiology': ['Tăng huyết áp', 'Nhồi máu cơ tim', 'Suy tim', 'Rối loạn nhịp tim', 'Huyết áp thấp', 'Viêm cơ tim']
}

print('Bắt đầu sinh dữ liệu cho 30 bệnh...')
for category, disease_list in diseases.items():
    for disease in disease_list:
        if disease in ['Viêm phổi', 'Nhồi máu cơ tim']:
            continue # Đã tạo mẫu
        print(f'-- Đang gọi API tạo bệnh: {disease} --')
        subprocess.run(['python', 'scripts/build_knowledge_base.py', disease, category])
