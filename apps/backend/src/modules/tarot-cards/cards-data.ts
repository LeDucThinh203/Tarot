export type SeedCard = {
  slug: string; name: string; nameVi: string; arcana: 'MAJOR' | 'MINOR'; suit: string | null; number: number | null;
  description: string; uprightMeaning: string; reversedMeaning: string; keywords: string[];
};

const majors: Array<[string, string, string, string, string[]]> = [
  ['The Fool', 'Kẻ Khờ', 'Khởi đầu mới, lòng tin và sự sẵn sàng bước vào điều chưa biết. Lá bài mời bạn tò mò, linh hoạt và chấp nhận học hỏi trên đường đi.', 'Bốc đồng, thiếu chuẩn bị hoặc né tránh trách nhiệm có thể khiến một khởi đầu tốt trở nên mong manh. Hãy kiểm tra ranh giới và nguồn lực trước khi nhảy bước.', ['khởi đầu', 'tự do', 'niềm tin']],
  ['The Magician', 'Nhà Ảo Thuật', 'Bạn có thể kết nối ý tưởng với hành động bằng kỹ năng và sự tập trung sẵn có. Đây là thời điểm thuận lợi để chủ động biến một dự định thành bước cụ thể.', 'Năng lực bị phân tán, tự nghi ngờ hoặc lời nói không đi cùng hành động. Hãy làm rõ mục tiêu và sử dụng nguồn lực một cách minh bạch.', ['ý chí', 'kỹ năng', 'sáng tạo']],
  ['The High Priestess', 'Nữ Tư Tế', 'Sự tĩnh lặng và quan sát giúp bạn nhận ra điều chưa được nói thành lời. Hãy dành chỗ cho trực giác nhưng đối chiếu nó với dữ kiện và trải nghiệm thực tế.', 'Có thể có điều chưa rõ, cảm xúc bị nén lại hoặc bạn đang dựa quá nhiều vào phỏng đoán. Chậm lại và hỏi thêm trước khi kết luận.', ['trực giác', 'nội tâm', 'bí ẩn']],
  ['The Empress', 'Hoàng Hậu', 'Nuôi dưỡng, sáng tạo và chăm sóc tạo điều kiện cho điều tốt đẹp phát triển. Lá bài nhắc bạn quan tâm đến cơ thể, sự phong phú và các mối quan hệ hỗ trợ.', 'Cho đi quá mức, trì hoãn chăm sóc bản thân hoặc để sự thoải mái thay thế tiến triển. Hãy tìm lại nhịp cân bằng và ranh giới lành mạnh.', ['nuôi dưỡng', 'sáng tạo', 'phong phú']],
  ['The Emperor', 'Hoàng Đế', 'Cấu trúc, trách nhiệm và sự nhất quán giúp bạn tạo nền tảng vững chắc. Một kế hoạch rõ ràng hoặc quyết định có nguyên tắc có thể hỗ trợ tình hình.', 'Cứng nhắc, kiểm soát quá mức hoặc thiếu một khuôn khổ đáng tin cậy. Hãy xem nguyên tắc nào đang bảo vệ bạn và nguyên tắc nào cần điều chỉnh.', ['cấu trúc', 'lãnh đạo', 'ổn định']],
  ['The Hierophant', 'Giáo Hoàng', 'Học hỏi từ truyền thống, người hướng dẫn hoặc một cộng đồng có thể đem lại điểm tựa. Lá bài khuyến khích bạn hiểu các quy tắc trước khi chọn cách tiếp nối hoặc đổi mới.', 'Niềm tin cũ có thể không còn phù hợp, hoặc bạn đang làm theo kỳ vọng bên ngoài mà chưa tự kiểm chứng. Hãy phân biệt sự hướng dẫn hữu ích với áp lực phải hòa nhập.', ['học hỏi', 'truyền thống', 'niềm tin']],
  ['The Lovers', 'Tình Nhân', 'Một lựa chọn quan trọng cần sự hòa hợp giữa giá trị, cảm xúc và hành động. Trong quan hệ, lá bài nhấn mạnh sự tương hỗ, trung thực và đồng thuận.', 'Mâu thuẫn giá trị, thiếu giao tiếp hoặc một lựa chọn chưa xuất phát từ điều bạn thật sự coi trọng. Hãy làm rõ nhu cầu và trách nhiệm của mỗi bên.', ['lựa chọn', 'kết nối', 'giá trị']],
  ['The Chariot', 'Cỗ Xe', 'Tiến triển đến từ định hướng rõ ràng và khả năng giữ vững tay lái giữa các lực kéo khác nhau. Tập trung vào điều bạn có thể chủ động và duy trì nhịp độ bền vững.', 'Mất phương hướng, cố ép tiến độ hoặc những ưu tiên xung đột. Trước khi tăng tốc, hãy chọn một hướng và điều chỉnh cách phối hợp.', ['ý chí', 'tiến triển', 'định hướng']],
  ['Strength', 'Sức Mạnh', 'Lòng can đảm mềm mại, kiên nhẫn và sự tự chủ có thể giúp bạn đi qua tình huống khó. Sức mạnh ở đây là hiểu cảm xúc và đáp lại chúng có chủ đích.', 'Tự nghi ngờ, phản ứng nóng hoặc cố kìm nén cảm xúc. Hãy tiếp cận bản thân bằng sự kiên nhẫn và tìm cách điều tiết phù hợp.', ['can đảm', 'kiên nhẫn', 'tự chủ']],
  ['The Hermit', 'Ẩn Sĩ', 'Một khoảng lặng có chủ đích giúp bạn tìm câu trả lời phù hợp với mình thay vì chạy theo tiếng ồn bên ngoài. Học hỏi và chiêm nghiệm có thể làm sáng tỏ bước kế tiếp.', 'Cô lập kéo dài, khép mình hoặc trì hoãn vì chờ sự chắc chắn tuyệt đối. Hãy cân nhắc chia sẻ suy nghĩ với một người đáng tin.', ['chiêm nghiệm', 'tĩnh lặng', 'dẫn đường']],
  ['Wheel of Fortune', 'Bánh Xe Số Phận', 'Hoàn cảnh đang chuyển động và một chu kỳ mới có thể mở ra. Nhận diện điều nằm ngoài kiểm soát để tập trung vào lựa chọn và cách thích ứng của bạn.', 'Kháng cự thay đổi, lặp lại một khuôn mẫu hoặc dựa hoàn toàn vào may rủi. Hãy tìm phần nhỏ bạn có thể tác động trong lúc tình hình dịch chuyển.', ['chu kỳ', 'thay đổi', 'cơ hội']],
  ['Justice', 'Công Lý', 'Sự rõ ràng, công bằng và trách nhiệm giúp bạn nhìn tình huống đúng tỷ lệ. Cân nhắc dữ kiện, hậu quả và cam kết của các bên trước khi quyết định.', 'Thiên kiến, thông tin thiếu hoặc né tránh phần trách nhiệm của mình có thể làm lệch đánh giá. Hãy kiểm tra giả định và đặt lại ranh giới công bằng.', ['cân bằng', 'trách nhiệm', 'sự thật']],
  ['The Hanged Man', 'Người Treo Ngược', 'Tạm dừng hoặc đổi góc nhìn có thể mở ra cách hiểu mới. Chưa hành động ngay đôi khi là lựa chọn chủ động để quan sát điều gì đang cần được buông.', 'Trì trệ, hy sinh không cần thiết hoặc chờ đợi mà không có chủ đích. Hãy xác định điều gì sẽ khiến bạn sẵn sàng chuyển bước.', ['đổi góc nhìn', 'tạm dừng', 'buông bỏ']],
  ['Death', 'Cái Chết', 'Một giai đoạn đang khép lại để nhường chỗ cho sự chuyển đổi. Hãy nhận diện điều đã hoàn thành và giữ lại bài học thay vì bám vào hình thức cũ.', 'Khó buông một điều đã hết vai trò hoặc thay đổi bị trì hoãn vì lo ngại. Bắt đầu bằng một kết thúc nhỏ, rõ ràng và do bạn lựa chọn.', ['chuyển đổi', 'kết thúc', 'tái sinh']],
  ['Temperance', 'Tiết Chế', 'Điều hòa các nhu cầu khác nhau bằng kiên nhẫn và thử nghiệm từng bước. Sự kết hợp vừa phải có thể đem lại giải pháp bền vững hơn lựa chọn cực đoan.', 'Thiếu cân bằng, nóng vội hoặc cố dung hòa điều vốn cần được phân định. Hãy xem nguồn lực nào đang bị dùng quá nhiều hoặc quá ít.', ['điều độ', 'hòa hợp', 'chữa lành']],
  ['The Devil', 'Ác Quỷ', 'Lá bài mời bạn quan sát các ràng buộc, thói quen hoặc ham muốn đang ảnh hưởng đến tự do lựa chọn. Nhận ra khuôn mẫu là bước đầu để quyết định có tiếp tục hay không.', 'Một sự lệ thuộc hoặc nỗi sợ có thể đang yếu đi khi bạn đặt lại giới hạn. Cũng có thể bạn đang phủ nhận một thói quen cần được nhìn nhận thành thật.', ['ràng buộc', 'ham muốn', 'nhận thức']],
  ['The Tower', 'Tòa Tháp', 'Một giả định hoặc cấu trúc không còn vững có thể bị thử thách, tạo cơ hội nhìn sự thật rõ hơn. Ưu tiên an toàn, hỗ trợ và những điều thiết thực khi thay đổi xảy ra.', 'Kháng cự điều đã rõ, hoặc căng thẳng âm ỉ cần được xử lý trước khi tích tụ thêm. Hãy chọn một cuộc trò chuyện hoặc điều chỉnh cụ thể để giảm áp lực.', ['đột phá', 'sự thật', 'tái thiết']],
  ['The Star', 'Ngôi Sao', 'Hy vọng và sự hồi phục có thể trở lại sau một giai đoạn mệt mỏi. Hãy chăm sóc điều làm bạn cảm thấy chân thật, đồng thời duy trì những bước tiến nhỏ.', 'Khó tin vào khả năng hồi phục, cạn năng lượng hoặc kỳ vọng quá xa thực tế. Hãy tìm một nguồn hỗ trợ gần gũi và đặt mục tiêu vừa sức.', ['hy vọng', 'hồi phục', 'cảm hứng']],
  ['The Moon', 'Mặt Trăng', 'Cảm xúc và những điều chưa rõ đang ảnh hưởng đến cách bạn nhìn tình huống. Đừng vội xem nỗi lo là sự thật; thu thập thông tin và quan sát điều gì lặp lại.', 'Sương mù đang dần tan hoặc một nỗi sợ cần được gọi tên. Kiểm chứng suy đoán bằng trao đổi trực tiếp và những bằng chứng có thể quan sát.', ['cảm xúc', 'bất định', 'trực giác']],
  ['The Sun', 'Mặt Trời', 'Sự rõ ràng, niềm vui và cảm giác được là chính mình có thể phát triển. Chia sẻ thành quả và chú ý những điều đang diễn ra tốt đẹp trong hiện tại.', 'Niềm vui bị che khuất bởi mệt mỏi, kỳ vọng quá cao hoặc nhu cầu được công nhận. Hãy giảm áp lực và cho phép thành công có nhiều hình thức.', ['niềm vui', 'sáng rõ', 'sức sống']],
  ['Judgement', 'Phán Xét', 'Đây là lúc nhìn lại với sự thành thật và quyết định mình muốn mang điều gì sang chặng tiếp theo. Một lời gọi bên trong có thể trở nên rõ hơn khi bạn chấp nhận kinh nghiệm đã qua.', 'Tự phán xét gay gắt, né tránh một quyết định hoặc khó khép lại chuyện cũ. Hãy tập trung vào bài học và hành động sửa chữa có thể thực hiện.', ['đánh giá', 'thức tỉnh', 'tha thứ']],
  ['The World', 'Thế Giới', 'Một vòng việc có thể đi đến hoàn tất và đem lại cảm giác kết nối, trưởng thành. Ghi nhận điều đã làm được rồi chọn mục tiêu tiếp theo từ một nền tảng vững hơn.', 'Một việc còn dang dở, khó công nhận thành quả hoặc chần chừ trước bước chuyển tiếp. Hãy xác định điều kiện cụ thể để khép lại chu kỳ này.', ['hoàn tất', 'hội nhập', 'thành tựu']],
];

const suits = [
  { key: 'wands', name: 'Wands', nameVi: 'Gậy', theme: 'ý chí, sáng tạo và hành động', upright: 'Năng lượng đang hướng đến sự chủ động, thử nghiệm và theo đuổi điều truyền cảm hứng.', reversed: 'Động lực có thể phân tán, bốc đồng hoặc bị chặn lại; hãy điều chỉnh nhịp độ và ưu tiên.' },
  { key: 'cups', name: 'Cups', nameVi: 'Cốc', theme: 'cảm xúc, quan hệ và trực giác', upright: 'Chú ý đến cảm xúc, sự đồng cảm và cách bạn trao đổi nhu cầu trong các mối quan hệ.', reversed: 'Cảm xúc có thể bị dồn nén, quá tải hoặc lý tưởng hóa; hãy lắng nghe nhưng giữ ranh giới.' },
  { key: 'swords', name: 'Swords', nameVi: 'Kiếm', theme: 'tư duy, giao tiếp và thử thách', upright: 'Sự thật, cách suy nghĩ và giao tiếp thẳng thắn có vai trò quan trọng trong tình huống này.', reversed: 'Suy nghĩ có thể rối, lời nói gây tổn thương hoặc một sự thật bị né tránh; hãy làm rõ thông tin.' },
  { key: 'pentacles', name: 'Pentacles', nameVi: 'Tiền', theme: 'công việc, nguồn lực và nền tảng thực tế', upright: 'Tiến triển bền vững đến từ kỹ năng, nguồn lực và sự chăm chút cho những điều hữu hình.', reversed: 'Nguồn lực, tính ổn định hoặc thói quen thực tế cần được rà soát; tránh đánh giá giá trị bản thân chỉ qua thành tích.' },
];
const ranks = [
  { name: 'Ace', vi: 'Át', theme: 'một mầm khởi đầu và cơ hội mới', number: 1 },
  { name: 'Two', vi: 'Hai', theme: 'sự cân nhắc, lựa chọn và phối hợp', number: 2 },
  { name: 'Three', vi: 'Ba', theme: 'sự phát triển, cộng tác và biểu đạt', number: 3 },
  { name: 'Four', vi: 'Bốn', theme: 'sự ổn định, cấu trúc và nghỉ ngơi', number: 4 },
  { name: 'Five', vi: 'Năm', theme: 'một thử thách giúp lộ ra điều cần điều chỉnh', number: 5 },
  { name: 'Six', vi: 'Sáu', theme: 'sự điều hòa, hỗ trợ và tiến triển', number: 6 },
  { name: 'Seven', vi: 'Bảy', theme: 'kiểm chứng chiến lược và sự kiên định', number: 7 },
  { name: 'Eight', vi: 'Tám', theme: 'luyện tập, chuyển động và nỗ lực', number: 8 },
  { name: 'Nine', vi: 'Chín', theme: 'một chặng gần hoàn tất và sự tự chủ', number: 9 },
  { name: 'Ten', vi: 'Mười', theme: 'kết quả, trách nhiệm và sự hoàn thành', number: 10 },
  { name: 'Page', vi: 'Tiểu Đồng', theme: 'sự tò mò, học hỏi và thông điệp mới', number: 11 },
  { name: 'Knight', vi: 'Hiệp Sĩ', theme: 'hành động, động lực và theo đuổi mục tiêu', number: 12 },
  { name: 'Queen', vi: 'Hoàng Hậu', theme: 'sự thấu hiểu, chăm sóc và ảnh hưởng điềm tĩnh', number: 13 },
  { name: 'King', vi: 'Hoàng Đế', theme: 'sự thành thạo, trách nhiệm và dẫn dắt', number: 14 },
];

export const tarotCards: SeedCard[] = [
  ...majors.map(([name, nameVi, uprightMeaning, reversedMeaning, keywords], index) => ({
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), name, nameVi, arcana: 'MAJOR' as const, suit: null, number: index,
    description: `${nameVi} là một lá Ẩn Chính gắn với một chủ đề lớn trong hành trình sống. ${uprightMeaning}`,
    uprightMeaning, reversedMeaning, keywords,
  })),
  ...suits.flatMap((suit) => ranks.map((rank) => ({
    slug: `${rank.name.toLowerCase()}-of-${suit.key}`,
    name: `${rank.name} of ${suit.name}`,
    nameVi: `${rank.vi} ${suit.nameVi}`,
    arcana: 'MINOR' as const,
    suit: suit.name.toUpperCase(),
    number: rank.number,
    description: `${rank.vi} ${suit.nameVi} kết hợp ${rank.theme} với ${suit.theme}. Lá bài phản ánh một giai đoạn trải nghiệm có thể lựa chọn, không phải dự đoán cố định.`,
    uprightMeaning: `${rank.theme[0]?.toLocaleUpperCase('vi-VN')}${rank.theme.slice(1)} thể hiện qua ${suit.theme}. ${suit.upright}`,
    reversedMeaning: `${rank.theme[0]?.toLocaleUpperCase('vi-VN')}${rank.theme.slice(1)} có thể chậm lại, bị sử dụng quá mức hoặc hướng vào bên trong trong lĩnh vực ${suit.theme}. ${suit.reversed}`,
    keywords: [rank.theme, suit.nameVi, rank.vi],
  }))),
];
