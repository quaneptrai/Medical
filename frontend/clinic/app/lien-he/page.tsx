import * as React from 'react';
import { MapPin, Phone, Mail, Clock, ShieldAlert, PhoneCall, CheckCircle2 } from 'lucide-react';
import { CLINIC_INFO } from '@/lib/clinic-data';

export const metadata = {
  title: 'Liên hệ & Chỉ đường · Phòng khám Đa khoa Quốc tế Quang Thanh',
  description: 'Địa chỉ, số điện thoại, giờ làm việc và hướng dẫn di chuyển tới Phòng khám Quang Thanh.',
};

export default function ContactPage() {
  return (
    <div className="clinic-page space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200 inline-block">
          Thông tin liên hệ
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 font-heading tracking-tight">
          Địa chỉ & Thời gian phục vụ
        </h1>
        <p className="text-sm md:text-base text-neutral-600">
          Điểm khám Quang Thanh tại An Lão, Hải Phòng, sẵn sàng tiếp nhận và hỗ trợ người bệnh mỗi ngày.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Contact Info Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main clinic */}
          <div className="bg-neutral-0 rounded-xl p-6 border border-neutral-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-brand-700 font-bold text-base">
              <MapPin className="w-5 h-5" />
              <span>Phòng khám Quang Thanh · An Lão</span>
            </div>
            <p className="text-sm text-neutral-800 font-medium">{CLINIC_INFO.address}</p>
            <p className="text-xs text-neutral-500">
              Khu vực Quang Trung, thuận tiện di chuyển trong huyện An Lão và các khu vực lân cận.
            </p>
          </div>

          {/* Arrival information */}
          <div className="bg-neutral-0 rounded-xl p-6 border border-neutral-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-brand-700 font-bold text-base">
              <MapPin className="w-5 h-5" />
              <span>Hướng dẫn khi đến khám</span>
            </div>
            <p className="text-sm text-neutral-800 font-medium">Có mặt trước lịch hẹn 15 phút để hoàn tất tiếp nhận.</p>
            <p className="text-xs text-neutral-500">
              Mang theo giấy tờ tùy thân, hồ sơ khám cũ và đơn thuốc đang sử dụng nếu có.
            </p>
          </div>

          {/* Opening hours & general hotline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200 space-y-2">
              <div className="flex items-center gap-2 text-neutral-800 font-bold text-xs uppercase tracking-wide">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Thời gian mở cửa</span>
              </div>
              <p className="text-sm font-semibold text-neutral-900">{CLINIC_INFO.openingHours}</p>
              <p className="text-xs text-neutral-500">Tiếp nhận cả ngày Thứ Bảy, CN & Lễ</p>
            </div>

            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200 space-y-2">
              <div className="flex items-center gap-2 text-neutral-800 font-bold text-xs uppercase tracking-wide">
                <Phone className="w-4 h-4 text-brand-600" />
                <span>Tổng đài CSKH</span>
              </div>
              <p className="text-sm font-semibold text-neutral-900">{CLINIC_INFO.hotline}</p>
              <p className="text-xs text-neutral-500">Email: {CLINIC_INFO.email}</p>
            </div>
          </div>
        </div>

        {/* Emergency & Transport Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-semantic-emergency">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold font-heading">
                Cấp cứu khẩn cấp 24/7
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
              Nếu bạn hoặc người thân có biểu hiện khó thở nặng, đau thắt ngực dữ dội, co giật, méo miệng hoặc chấn thương nặng, vui lòng gọi cấp cứu ngay lập tức.
            </p>
            <a
              href="tel:115"
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#B91C1C] hover:bg-red-700 text-white font-bold text-base rounded-md shadow-md transition-colors"
            >
              <PhoneCall className="w-5 h-5" />
              <span>GỌI CẤP CỨU: 115</span>
            </a>
          </div>

          <div className="bg-neutral-0 rounded-xl p-6 border border-neutral-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
              Chính sách đón tiếp & Tiện ích
            </h2>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hỗ trợ xe lăn và nhân viên điều dưỡng hỗ trợ tại sảnh</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Khu vực chờ vô trùng, wifi tốc độ cao và nước uống miễn phí</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Nhận kết quả xét nghiệm và đơn thuốc điện tử qua Zalo/SMS</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
