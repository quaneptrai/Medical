const card = document.querySelector('.voice-card');
const voiceButton = document.querySelector('#voiceButton');
const voiceHint = document.querySelector('#voiceHint');
const transcript = document.querySelector('#transcript p');
const confirmVoice = document.querySelector('#confirmVoice');
const input = document.querySelector('#symptomText');

let timer;

function resetVoice() {
  clearTimeout(timer);
  card.dataset.state = 'idle';
  voiceButton.setAttribute('aria-pressed', 'false');
  voiceButton.querySelector('.voice-button-label').textContent = 'Chạm để nói';
  voiceButton.setAttribute('aria-label', 'Bắt đầu nói');
  voiceHint.textContent = 'Bạn có thể nói: “Tôi ho và sốt nhẹ từ tối qua...”';
}

voiceButton.addEventListener('click', () => {
  if (card.dataset.state === 'listening') {
    clearTimeout(timer);
    card.dataset.state = 'ready';
  } else {
    card.dataset.state = 'listening';
    voiceButton.setAttribute('aria-pressed', 'true');
    voiceButton.setAttribute('aria-label', 'Dừng ghi âm');
    voiceButton.querySelector('.voice-button-label').textContent = 'Đang nghe…';
    voiceHint.textContent = 'Hãy nói chậm, rõ. Chạm lần nữa để dừng.';
    transcript.textContent = 'Tôi ho khan từ tối qua, hơi sốt và cảm thấy mệt.';
    timer = setTimeout(() => {
      card.dataset.state = 'ready';
      voiceButton.setAttribute('aria-pressed', 'false');
      voiceButton.querySelector('.voice-button-label').textContent = 'Nói lại';
      voiceButton.setAttribute('aria-label', 'Ghi âm lại');
      voiceHint.textContent = 'Đã ghi nhận. Bạn có thể xác nhận hoặc nói lại.';
    }, 2200);
  }
});

confirmVoice.addEventListener('click', () => {
  input.value = transcript.textContent;
  resetVoice();
  input.focus();
});

document.querySelectorAll('.quick-prompts button').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = button.textContent;
    input.focus();
  });
});
