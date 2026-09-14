'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Clock3,
  HeartPulse,
  LockKeyhole,
  MapPin,
  Mic,
  PhoneCall,
  ScanLine,
  Send,
  ShieldCheck,
  Smile,
  Stethoscope,
} from 'lucide-react';
import styles from './AiDashboardHome.module.css';

type VoiceState = 'idle' | 'listening' | 'ready' | 'unsupported' | 'error';

interface SpeechRecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

interface SpeechRecognitionErrorEventLike { error: string; }

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const quickPrompts = ['Ho và sốt nhẹ', 'Đau mỏi vai gáy', 'Khó chịu vùng bụng'];

const specialties = [
  { title: 'Nội tổng quát', description: 'Khám ban đầu khi triệu chứng chưa rõ nguyên nhân.', icon: Stethoscope, tone: 'sky' },
  { title: 'Sản · Phụ khoa', description: 'Chăm sóc sức khỏe phụ nữ và theo dõi thai kỳ.', icon: HeartPulse, tone: 'yellow' },
  { title: 'Răng Hàm Mặt', description: 'Khám, tư vấn và chăm sóc sức khỏe răng miệng.', icon: Smile, tone: 'mint' },
  { title: 'Chẩn đoán hình ảnh', description: 'Hỗ trợ bác sĩ đánh giá bằng thiết bị chuyên môn.', icon: ScanLine, tone: 'coral' },
] as const;

export function AiDashboardHome() {
  const router = useRouter();
  const [input, setInput] = React.useState('');
  const [voiceState, setVoiceState] = React.useState<VoiceState>('idle');
  const [voiceMessage, setVoiceMessage] = React.useState('Bạn có thể nói: “Tôi ho và sốt nhẹ từ tối qua...”');
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  React.useEffect(() => () => recognitionRef.current?.stop(), []);

  const continueToTriage = React.useCallback((text: string) => {
    const value = text.trim();
    if (value) sessionStorage.setItem('botmed_initial_intake', value);
    router.push('/tro-ly');
  }, [router]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    continueToTriage(input);
  };

  const toggleVoice = () => {
    if (voiceState === 'listening') {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceState('unsupported');
      setVoiceMessage('Trình duyệt này chưa hỗ trợ nhập giọng nói. Bạn vẫn có thể nhập bằng bàn phím.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interimTranscript += result[0].transcript;
      }
      const nextTranscript = (finalTranscript || interimTranscript).trim();
      if (nextTranscript) setInput(nextTranscript);
    };

    recognition.onerror = (event) => {
      setVoiceState('error');
      setVoiceMessage(event.error === 'not-allowed'
        ? 'Micro đang bị chặn. Hãy cấp quyền hoặc dùng bàn phím.'
        : 'Chưa nghe rõ. Bạn có thể thử nói lại hoặc nhập bằng bàn phím.');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceState((current) => {
        if (current === 'error' || current === 'unsupported') return current;
        return finalTranscript.trim() ? 'ready' : 'idle';
      });
      setVoiceMessage(finalTranscript.trim()
        ? 'Đã ghi nhận. Kiểm tra lại nội dung trước khi tiếp tục.'
        : 'Chạm micro và nói chậm, rõ để thử lại.');
    };

    setVoiceState('listening');
    setVoiceMessage('Đang nghe… Hãy mô tả triệu chứng và thời điểm bắt đầu.');
    recognition.start();
  };

  return (
    <div className={styles.home}>
      <section className={styles.intakeSection} aria-labelledby="home-heading">
        <div className={styles.intakeColumn}>
          <p className={styles.eyebrow}>✦ Chăm sóc bắt đầu từ lắng nghe</p>
          <h1 id="home-heading">Kể điều bạn đang thấy <em>không ổn.</em></h1>
          <p className={styles.lead}>
            Nói hoặc nhập triệu chứng bằng cách tự nhiên. Trợ lý sẽ giúp bạn sắp xếp thông tin,
            kiểm tra dấu hiệu cần chú ý và gợi ý chuyên khoa phù hợp trước khi gặp bác sĩ.
          </p>

          <form className={styles.voiceCard} onSubmit={submit}>
            <div className={styles.voiceHeader}>
              <div><span>BƯỚC 1 · MÔ TẢ TRIỆU CHỨNG</span><h2>Hôm nay bạn cảm thấy thế nào?</h2></div>
              <p><LockKeyhole aria-hidden="true" /> Không lưu khi chưa đồng ý</p>
            </div>

            <div className={`${styles.voiceStage} ${styles[voiceState]}`} aria-live="polite">
              <button className={styles.voiceButton} type="button" onClick={toggleVoice} aria-pressed={voiceState === 'listening'}>
                <Mic aria-hidden="true" />
                <span>{voiceState === 'listening' ? 'Dừng nghe' : voiceState === 'ready' ? 'Nói lại' : 'Chạm để nói'}</span>
              </button>
              <div className={styles.voiceFeedback}>
                <div className={styles.waveform} aria-hidden="true">
                  {Array.from({ length: 11 }).map((_, index) => <i key={index} />)}
                </div>
                <p>{voiceMessage}</p>
              </div>
            </div>

            {input && voiceState === 'ready' ? (
              <div className={styles.transcript}>
                <div><span>Bản ghi đã nhận</span><p>{input}</p></div>
                <button type="submit">Dùng mô tả này <ArrowRight aria-hidden="true" /></button>
              </div>
            ) : null}

            <div className={styles.textEntry}>
              <label htmlFor="home-symptom-input">Hoặc nhập bằng bàn phím</label>
              <div>
                <input
                  id="home-symptom-input"
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    if (voiceState === 'ready') setVoiceState('idle');
                  }}
                  placeholder="Ví dụ: đau đầu, chóng mặt từ sáng..."
                />
                <button type="submit" aria-label="Tiếp tục với mô tả đã nhập"><Send aria-hidden="true" /></button>
              </div>
            </div>

            <div className={styles.quickPrompts}>
              <span>Gợi ý nhanh:</span>
              {quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => setInput(prompt)}>{prompt}</button>)}
            </div>
          </form>

          <p className={styles.disclaimer}>
            <ShieldCheck aria-hidden="true" /> Kết quả chỉ hỗ trợ định hướng ban đầu, không thay thế thăm khám của bác sĩ.
          </p>
        </div>

        <aside className={styles.receptionColumn} aria-label="Thông tin tiếp nhận tại phòng khám">
          <div className={styles.clinicImage}>
            <Image src="/images/clinic-family-hero.png" alt="Bác sĩ trò chuyện với một gia đình trong không gian phòng khám sáng" fill priority sizes="680px" />
          </div>
          <div className={styles.todayPanel}>
            <div className={styles.todayHeading}>
              <div><span>Tiếp nhận tại phòng khám</span><h2>Thông tin cần biết hôm nay</h2></div>
              <p><i aria-hidden="true" /> Đang tiếp nhận</p>
            </div>
            <dl>
              <div><dt><Clock3 aria-hidden="true" /> Giờ khám</dt><dd>Sáng 08:00–12:00 · Chiều 13:00–19:00, Thứ Hai–Chủ nhật</dd></div>
              <div><dt><MapPin aria-hidden="true" /> Địa chỉ</dt><dd>Quang Trung, An Lão, Hải Phòng</dd></div>
              <div><dt><Stethoscope aria-hidden="true" /> Hỗ trợ</dt><dd><Link href="/dat-lich">Đặt lịch</Link> · <Link href="/chuyen-khoa">Chọn chuyên khoa</Link></dd></div>
            </dl>
            <div className={styles.urgentRow}>
              <div><strong>Khi có dấu hiệu nguy hiểm</strong><span>Không tiếp tục chờ tư vấn trực tuyến</span></div>
              <a href="tel:115"><PhoneCall aria-hidden="true" /> Gọi 115</a>
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.specialtySection} aria-labelledby="specialty-heading">
        <div className={styles.sectionHeading}>
          <div><span>Dịch vụ nổi bật</span><h2 id="specialty-heading">Chọn điểm bắt đầu phù hợp</h2></div>
          <Link href="/chuyen-khoa">Xem tất cả chuyên khoa <ArrowRight aria-hidden="true" /></Link>
        </div>
        <div className={styles.specialtyGrid}>
          {specialties.map(({ title, description, icon: Icon, tone }) => (
            <article key={title} className={`${styles.specialtyCard} ${styles[tone]}`}>
              <Icon aria-hidden="true" />
              <div><h3>{title}</h3><p>{description}</p></div>
              <Link href="/chuyen-khoa" aria-label={`Xem ${title}`}><ArrowRight aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.journeySection} aria-labelledby="journey-heading">
        <div>
          <span>Một hành trình, không nhập lại</span>
          <h2 id="journey-heading">Từ điều bạn kể đến lịch hẹn phù hợp.</h2>
          <Link href="/dat-lich">Đặt lịch khám <ArrowRight aria-hidden="true" /></Link>
        </div>
        <ol>
          <li><span>01</span><div><strong>Mô tả triệu chứng</strong><p>Nói hoặc nhập theo cách tự nhiên.</p></div></li>
          <li><span>02</span><div><strong>Nhận hướng dẫn ban đầu</strong><p>Kiểm tra dấu hiệu cần chú ý và chuyên khoa gợi ý.</p></div></li>
          <li><span>03</span><div><strong>Chọn bác sĩ và khung giờ</strong><p>Chỉ giữ lại thông tin cần thiết khi bạn đồng ý.</p></div></li>
        </ol>
      </section>
    </div>
  );
}
