# Tài liệu Debug Xác thực 2 bước (2FA OTP) - Frontend Service

Tài liệu này ghi nhận việc bổ sung log debug tại màn hình cài đặt xác thực 2 bước (2FA) trong Component Profile nhằm phân tích nguyên nhân tại sao dữ liệu mã OTP 6 số nhập vào bị lặp (duplicate).

---

## 1. Vị trí và các hàm được thêm Log
Các thay đổi được thực hiện trực tiếp trên file frontend component:
* **File:** `codebase/frontend/src/app/profile/profile.component.ts`
* **Các hàm thay đổi:**
  * `onOtpInput(event: Event, index: number)`: Xử lý khi người dùng nhập ký tự vào một ô input.
  * `onOtpKeyDown(event: KeyboardEvent, index: number)`: Kiểm soát các phím nhấn xuống như Backspace, mũi tên, phím chức năng và lọc ký tự không phải số.
  * `onOtpPaste(event: ClipboardEvent)`: Xử lý khi người dùng dán (paste) chuỗi OTP 6 số vào các ô nhập.

---

## 2. Chi tiết các dòng Log đã thêm

Hệ thống log mới được cấu trúc với tiền tố `[OTP DEBUG]` để dễ dàng lọc và theo dõi trong Console của trình duyệt (F12 / Developer Tools).

### 2.1. Log khi có sự kiện Nhấn Phím (`onOtpKeyDown`)
Mục đích: Xác định phím vật lý nào đã được kích hoạt, trạng thái giá trị của ô nhập trước khi ký tự được đưa vào.
```typescript
console.log(`[OTP DEBUG] onOtpKeyDown - Index: ${index}, Key: "${event.key}", Ctrl: ${event.ctrlKey}, Meta: ${event.metaKey}, Current Input Value: "${input.value}"`);
```
* **Ý nghĩa:**
  * `Index`: Vị trí ô nhập hiện tại (0 - 5).
  * `Key`: Phím được nhấn (ví dụ: `"1"`, `"Backspace"`, `"v"`...).
  * `Current Input Value`: Giá trị hiện có trong ô nhập trước khi xử lý keydown kết thúc.

### 2.2. Log khi có sự kiện Nhập Ký Tự (`onOtpInput`)
Mục đích: Theo dõi luồng xử lý và biến đổi giá trị của ký tự vừa nhập, bao gồm cả việc chuyển đổi focus.
```typescript
console.log(`[OTP DEBUG] onOtpInput - Index: ${index}`);
console.log(`[OTP DEBUG]   Raw Input Value: "${rawVal}"`);
console.log(`[OTP DEBUG]   Current otpDigits state before update:`, JSON.stringify(this.otpDigits));
...
console.log(`[OTP DEBUG]   Value after filtering non-digits: "${val}"`);
...
console.log(`[OTP DEBUG]   Value after keeping only last char: "${val}"`);
...
console.log(`[OTP DEBUG]   Updated otpDigits state:`, JSON.stringify(this.otpDigits));
...
console.log(`[OTP DEBUG]   Moving focus to index: ${index + 1}`);
```
* **Ý nghĩa:**
  * Giúp kiểm tra xem sự kiện `input` có bị kích hoạt 2 lần cho cùng một phím bấm hay không.
  * Theo dõi giá trị thô (`Raw Input Value`) nhận được từ trình duyệt để biết trình duyệt có tự động sinh ra ký tự lặp hoặc nhận diện bộ gõ (IME) sai hay không.
  * Theo dõi trạng thái của mảng lưu trữ 6 số `otpDigits` qua từng bước.

### 2.3. Log khi Thực hiện Dán (`onOtpPaste`)
Mục đích: Kiểm tra dữ liệu từ Clipboard và quá trình phân bổ chuỗi số vào 6 ô input.
```typescript
console.log(`[OTP DEBUG] onOtpPaste - Raw Paste Data: "${pasteData}"`);
console.log(`[OTP DEBUG]   Digits extracted: "${digits}"`);
console.log(`[OTP DEBUG]   otpDigits after paste:`, JSON.stringify(this.otpDigits));
console.log(`[OTP DEBUG]   Setting focus to index: ${focusIndex}`);
```

---

## 3. Các nguyên nhân phổ biến có thể gây Duplicate dữ liệu OTP
Dựa trên kiến trúc xử lý OTP nhiều ô nhập độc lập, hiện tượng duplicate ký tự hoặc nhảy ô sai thường do các nguyên nhân sau:

1. **Trùng lặp sự kiện giữa `keydown` và `input`**:
   * Khi nhấn phím, sự kiện `keydown` chạy trước, kiểm tra tính hợp lệ rồi cho phép ký tự đi vào ô. Ngay sau đó sự kiện `input` chạy để cập nhật giá trị.
   * Nếu trên thiết bị di động (đặc biệt là Android Chrome), phím nhấn xuống có thể gửi một giá trị đè hoặc kích hoạt bộ gõ khiến sự kiện `input` nhận giá trị dài hơn 1 ký tự (ví dụ gõ `"1"` nhưng ô input nhận `"11"`).

2. **Ảnh hưởng từ Bộ gõ tiếng Việt (IME)**:
   * Khi bật bộ gõ tiếng Việt (như Telex/VNI), một số ký tự số có thể bị hiểu lầm là dấu hoặc kích hoạt quá trình soạn thảo văn bản (composition). Điều này khiến trình duyệt kích hoạt liên tiếp các sự kiện `compositionupdate`, `input` và làm nhân đôi ký tự hoặc kích hoạt việc nhảy ô sớm khi ký tự chưa ổn định.

3. **Cơ chế Tự động điền (Autofill / One-Time Code)**:
   * Trên thiết bị iOS/macOS hoặc các trình quản lý mật khẩu, tính năng tự động điền mã OTP từ SMS hoặc Authenticator có thể tự động paste toàn bộ mã vào ô đầu tiên và đồng thời kích hoạt sự kiện `input` trên từng ô, dẫn đến việc dữ liệu bị nhân bản hoặc điền lặp.

---

## 4. Hướng dẫn sử dụng Log để kiểm tra thực tế
1. Mở trang Web, đi tới màn hình thiết lập 2FA (Profile -> Kích hoạt xác thực 2 bước).
2. Nhấn `F12`, chuyển sang tab **Console**.
3. Tại ô tìm kiếm của Console, lọc theo từ khoá `[OTP DEBUG]`.
4. Tiến hành gõ các số hoặc paste mã OTP vào các ô.
5. Quan sát thứ tự log xuất hiện:
   * Nếu thấy cùng một `Index` mà log `onOtpInput` xuất hiện **2 lần liên tiếp** với cùng một ký tự -> Do sự kiện bị lặp hoặc trỏ focus bị chồng chéo.
   * Nếu log `Raw Input Value` hiển thị chuỗi có độ dài `>= 2` (ví dụ `"55"`) ngay ở lần gõ đầu tiên -> Do bộ gõ IME hoặc cơ chế phần cứng của thiết bị tự gấp đôi ký tự trước khi truyền vào hàm xử lý.

---

## 5. Nguyên nhân thực tế & Giải pháp khắc phục

### 5.1. Nguyên nhân thực tế phát hiện qua Log
Dựa trên hình ảnh log thực tế khi người dùng gõ số `"2"` vào ô đầu tiên (Index 0):
1. **Sự kiện kích hoạt cực kỳ chuẩn xác**: Chỉ có đúng 1 sự kiện `onOtpKeyDown` và 1 sự kiện `onOtpInput` chạy cho ô Index 0.
2. **Không có bất kỳ sự kiện nào kích hoạt trên ô Index 1** (Không có log `onOtpInput - Index: 1` hay `onOtpKeyDown - Index: 1`).
3. **Mảng model cập nhật chuẩn**: `otpDigits` sau khi cập nhật là `["2", "", "", "", "", ""]`. Phần tử thứ hai (`otpDigits[1]`) vẫn là chuỗi rỗng `""`.
4. **Nhưng giao diện hiển thị sai lệch**: Ô nhập thứ 2 tự động hiển thị số `"2"`.

**Kết luận nguyên nhân:**
Đây là một **lỗi render kinh điển của Angular** do thiếu `trackBy` trong cấu trúc `*ngFor` khi duyệt qua mảng chứa các kiểu dữ liệu nguyên bản (primitive) có giá trị giống nhau (ở đây là nhiều chuỗi rỗng `''`):
* Mặc định, Angular so sánh các phần tử trong `*ngFor` dựa trên giá trị (`identity`). Khi mảng chuyển đổi từ `['', '', '', '', '', '']` sang `['2', '', '', '', '', '']`, các chuỗi rỗng `''` còn lại bị Angular hiểu nhầm là đã thay đổi vị trí hoặc cần tái sử dụng một cách lộn xộn.
* Kết quả là Angular hoán đổi DOM element của ô Index 0 (đang chứa ký tự `"2"` vật lý do người dùng gõ vào) sang làm DOM element cho ô Index 1.
* Do Angular binding giá trị theo cơ chế một chiều `[value]="otpDigits[i]"` và model `otpDigits[1]` vẫn là `""` (không đổi từ đầu), Angular change detection không thực hiện ghi đè giá trị `""` vào DOM, khiến ô Index 1 giữ nguyên ký tự hiển thị `"2"` của DOM cũ bị gán nhầm.

### 5.2. Giải pháp khắc phục triệt để
Bắt buộc phải định danh cấu trúc lặp theo chỉ mục cố định (`index`) của mảng thay vì so sánh giá trị:

1. **Thêm hàm định danh chỉ mục trong Component (`profile.component.ts`):**
   ```typescript
   trackByIndex(index: number, item: any): number {
     return index;
   }
   ```
2. **Áp dụng `trackBy` vào directive `*ngFor` tại Template (`profile.component.html`):**
   ```html
   *ngFor="let digit of otpDigits; let i = index; trackBy: trackByIndex"
   ```
   * **Kết quả:** Angular liên kết cố định DOM element thứ `i` với chỉ mục `i` trong mảng `otpDigits`. Khi dữ liệu thay đổi, DOM element của các ô input giữ nguyên vị trí, không bị hoán đổi, loại bỏ hoàn toàn lỗi duplicate hiển thị.

---

## 6. Cải tiến trải nghiệm người dùng (UX) - Tự động Focus khi mở Popup
Để nâng cao trải nghiệm người dùng, khi popup thiết lập 2FA được mở lên, hệ thống sẽ tự động focus con trỏ và bôi đen nội dung (select) tại ô nhập chữ số đầu tiên (Index 0).

* **Thực hiện tại Template (`profile.component.html`):**
  Lắng nghe sự kiện `(nzAfterOpen)` từ component `<nz-modal>` để đảm bảo DOM của modal đã được chèn và hiển thị hoàn toàn trên trình duyệt:
  ```html
  <nz-modal ... (nzAfterOpen)="focusFirstOtpInput()">
  ```

* **Thực hiện tại Component (`profile.component.ts`):**
  ```typescript
  focusFirstOtpInput(): void {
    const inputsArray = this.otpInputs?.toArray() || [];
    const firstInput = inputsArray[0]?.nativeElement;
    if (firstInput) {
      setTimeout(() => {
        firstInput.focus();
        firstInput.select();
      }, 50);
    }
  }
  ```
  * **Cơ chế:** Việc bọc trong `setTimeout` 50ms là thực tế phát triển tốt nhất nhằm đợi cho các hoạt ảnh chuyển động mở modal (CSS transitions/animations) của thư viện UI kết thúc hoàn toàn, tránh việc trình duyệt bỏ qua sự kiện focus do phần tử chưa ở trạng thái tương tác được (visible & interactive).

---

## 7. Giải quyết lỗi "400 Bad Request" khi kích hoạt 2FA

### 7.1. Hiện trạng lỗi
Khi người dùng nhập đúng mã OTP 6 số từ Google Authenticator và nhấn kích hoạt, hệ thống trả về mã lỗi HTTP `400 Bad Request` từ endpoint `/auth/2fa/verify`.

### 7.2. Nguyên nhân sâu xa (Lỗi logic thiết kế Frontend)
Mã OTP được sinh ra từ điện thoại dựa trên **Secret Key** và **thời gian thực của hệ thống (TOTP)**.
Trong cấu trúc cũ của Frontend, hàm `startTimer()` có logic như sau:
```typescript
private startTimer(): void {
  this.stopTimer();
  this.remainingTime = 30;
  this.timerInterval = setInterval(() => {
    this.remainingTime--;
    if (this.remainingTime <= 0) {
      this.generate2faSecret(); // LỖI NGHIÊM TRỌNG!
    }
  }, 1000);
}
```
* **Vấn đề xảy ra:** Cứ sau mỗi 30 giây, khi bộ đếm đếm ngược hết hạn, frontend tự động gọi lại `generate2faSecret()` để yêu cầu Server tạo ra **Secret Key mới** và cập nhật QR Code mới trên giao diện.
* **Hậu quả:** 
  1. Người dùng quét mã QR lúc giây thứ 10, lưu Secret Key A trên điện thoại.
  2. Người dùng gõ mã OTP vào các ô nhập. Tuy nhiên nếu họ gõ chậm hoặc thời gian đếm ngược trôi hết 30 giây trước khi họ nhấn nút "Kích hoạt", Frontend đã tự động yêu cầu Server tạo **Secret Key B** và ghi đè vào DB.
  3. Khi người dùng nhấn nút kích hoạt, mã OTP (được sinh từ Key A trên điện thoại) được gửi lên Server để kiểm tra chéo với Key B đang được lưu trong DB. Sự bất đồng nhất về Secret Key khiến việc xác thực TOTP thất bại, Server trả về HTTP `400 Bad Request` ("Invalid OTP code").

* **Bản chất logic đúng:** Secret Key dùng để liên kết tài khoản chỉ cần sinh **1 lần duy nhất** khi mở popup. Bộ đếm 30 giây chỉ đại diện cho chu kỳ đổi mã của ứng dụng Authenticator trên điện thoại để người dùng theo dõi, **tuyệt đối không được phép** tự động sinh lại Secret Key trên Server.

### 7.3. Giải pháp khắc phục triệt để
Sửa đổi hàm `startTimer()` trong `profile.component.ts` để chỉ cập nhật lại số giây đếm ngược hiển thị của chu kỳ TOTP mà không kích hoạt gọi lại API sinh khóa bí mật:

```typescript
private startTimer(): void {
  this.stopTimer();
  
  // Tính toán số giây còn lại trong chu kỳ 30s của Unix epoch để đồng bộ hoàn hảo với Google Authenticator
  const getSecondsRemaining = () => 30 - (Math.floor(Date.now() / 1000) % 30);
  this.remainingTime = getSecondsRemaining();

  this.timerInterval = setInterval(() => {
    this.remainingTime--;
    if (this.remainingTime <= 0) {
      // Chỉ reset lại bộ đếm giây hiển thị
      // Tuyệt đối KHÔNG gọi generate2faSecret() để tránh làm thay đổi Secret Key trên Server
      this.remainingTime = getSecondsRemaining();
    }
  }, 1000);
}
```
* **Lợi ích kép:**
  * **Sửa hoàn toàn lỗi 400 Bad Request:** Secret Key trên server được giữ cố định suốt quá trình mở popup, đảm bảo mã OTP gửi lên luôn khớp với khóa bí mật đã quét.
  * **Premium UX:** Số giây đếm ngược trên giao diện Web đồng bộ **khớp từng giây** một cách hoàn hảo với vòng tròn đếm ngược của ứng dụng Google Authenticator trên điện thoại (vì cả hai đều tính toán dựa trên chu kỳ Unix epoch thời gian thực).


