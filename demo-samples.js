/* Fixed, translated examples. No personal records or live AI service are used.
   audio/* recordings read the exact response strings below in their language. */
window.PharmaSnapSamples = {
  locales: {
    en: {
      tag: 'en-AU', name: 'English', idle: 'Ready when you are.', ready: 'Sample answer',
      playing: 'Playing the English sample…', complete: 'Sample complete.', stopped: 'Playback stopped.',
      failed: 'Audio could not play. Try the sample again; the translated answer is shown below.',
      question: 'Sample question', spoken: 'Spoken answer', included: 'Included in this sample',
      documents: {medicine: 'Medicine pack', blood: 'Blood test', hospital: 'Hospital report'},
      count: n => `${n} sample ${n === 1 ? 'item' : 'items'} selected`,
      packA: 'Sample pack A', packB: 'Sample pack B', active: 'Active ingredient', same: 'Shared ingredient highlighted',
      hint: 'Choose English or Vietnamese for the written answer and spoken answer. These samples use recorded audio; no microphone is accessed.'
    },
    vi: {
      tag: 'vi', name: 'Tiếng Việt', idle: 'Sẵn sàng khi bạn muốn.', ready: 'Câu trả lời mẫu',
      playing: 'Đang phát câu trả lời mẫu bằng tiếng Việt…', complete: 'Đã phát xong.', stopped: 'Đã dừng phát.',
      failed: 'Không thể phát âm thanh. Hãy thử lại; câu trả lời đã dịch vẫn hiển thị bên dưới.',
      question: 'Câu hỏi mẫu', spoken: 'Câu trả lời được đọc', included: 'Tài liệu trong ví dụ này',
      documents: {medicine: 'Hộp thuốc', blood: 'Kết quả xét nghiệm máu', hospital: 'Báo cáo bệnh viện'},
      count: n => `Đã chọn ${n} tài liệu mẫu`,
      packA: 'Hộp thuốc mẫu A', packB: 'Hộp thuốc mẫu B', active: 'Hoạt chất', same: 'Hoạt chất trùng nhau được đánh dấu',
      hint: 'Chọn tiếng Anh hoặc tiếng Việt cho câu trả lời bằng văn bản và câu trả lời được đọc. Các ví dụ dùng âm thanh đã ghi sẵn; không truy cập micrô.'
    }
  },
  samples: {
    conversation: {
      en: {question: 'Can I ask about my medicine and hospital report together?', response: 'You choose which documents to include in your question. You can ask about a medicine pack and a hospital report together. This is a sample conversation, not a medical answer.'},
      vi: {question: 'Tôi có thể hỏi về thuốc và báo cáo bệnh viện cùng lúc không?', response: 'Bạn chọn những tài liệu muốn đưa vào câu hỏi. Bạn có thể hỏi về hộp thuốc và báo cáo bệnh viện cùng lúc. Đây là cuộc trò chuyện mẫu, không phải câu trả lời y tế.'}
    },
    documents: {
      en: {question: 'How can I ask about these selected documents?', response: 'These are sample documents you selected for one question. In the app, you choose the items you want to discuss, then ask what you would like explained. This preview does not read or upload health records.'},
      vi: {question: 'Tôi có thể hỏi về những tài liệu đã chọn này như thế nào?', response: 'Đây là những tài liệu mẫu bạn đã chọn cho một câu hỏi. Trong ứng dụng, bạn chọn những tài liệu muốn thảo luận, rồi hỏi về điều bạn muốn được giải thích. Bản xem thử này không đọc hoặc tải lên hồ sơ sức khỏe.'}
    },
    ingredients: {
      en: {question: 'Do these two sample labels share an active ingredient?', response: 'Both fictional labels list paracetamol as an active ingredient. Different names on the front of a pack can hide the same ingredient inside. Ask a pharmacist to check your exact medicines before taking them together. This example does not assess your own medicines.'},
      vi: {question: 'Hai nhãn thuốc mẫu này có cùng hoạt chất không?', response: 'Cả hai nhãn thuốc giả định đều ghi paracetamol là hoạt chất. Tên khác nhau trên hộp thuốc có thể che đi việc chúng chứa cùng một hoạt chất. Hãy nhờ dược sĩ kiểm tra chính xác các thuốc của bạn trước khi dùng cùng nhau. Ví dụ này không đánh giá thuốc của riêng bạn.'}
    }
  }
};
