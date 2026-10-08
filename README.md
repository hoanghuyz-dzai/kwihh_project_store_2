# ◆ KWIHH PROJECT — Code. Build. Create.
Nền tảng bán Bot / Tool / Tiện ích / Website: landing 3D, ví số dư, mua & tải file qua backend, nạp Bank duyệt tay, admin panel. **Không cần `npm install`** (0 dependency), chạy trên **Node ≥ 18**.

## Chạy local
```bash
cp .env.example .env      # chỉnh ADMIN_PASSWORD nếu muốn
npm run seed              # tạo admin + demo + catalog + file demo
npm start                 # http://localhost:3000
npm test                  # 45 kiểm tra end-to-end
```
Tài khoản mẫu: `admin` (mật khẩu = `ADMIN_PASSWORD`, hoặc ngẫu nhiên in ra **một lần** trong log) và `demo` (20.000đ, mật khẩu `DEMO_PASSWORD`).

## Kiến trúc
```
server/  index.js (HTTP, auth, headers) · routes.js · config.js · seed.js
  lib/       store.js (repository + transaction atomic) · security.js · util.js (validator)
  services/  accounts · shop · bank · admin · fileResolver
public/  index.html · css/style.css · js/ (api · ui · bg(3D) · landing · shop · bank · account · admin · main)
data/    file/ (sản phẩm .zip) · bank/ (ảnh QR)      # store.json sinh ra khi chạy
```
Luồng: `Page → API service → Route → Service → Store`. Frontend chỉ gửi `service_id`; **giá, file, số dư** đều do backend quyết định.

## Quy tắc file sản phẩm
`resolveProductFile(category, type, price)` → `data/file/<category><type><giá>k.zip`, ví dụ `bot` + `telegram` + 20000 → `bottelegram20k.zip`. Thêm sản phẩm: Admin → Services (tạo dịch vụ) rồi Admin → Files (upload zip đúng tên). Chưa có file thì không cho mua và không trừ tiền.

## Nạp Bank
User chọn mệnh giá → chuyển khoản với nội dung **`NAP BANK @username`** → bấm "Tôi đã chuyển khoản" → yêu cầu `pending`. Admin đối chiếu ngân hàng rồi DUYỆT/TỪ CHỐI (không duyệt 2 lần). Cấu hình ngân hàng + QR tại Admin → Bank. Tiền **không bao giờ** tự cộng.

## Đưa lên GitHub & có link web
1. `git init && git add . && git commit -m "Kwihh Project" && git push` (repo **Private** nếu có file sản phẩm thật; `.gitignore` đã chặn `store.json`, `.env`, `data/file/*.zip`, `data/bank/*`).
2. GitHub Pages **không chạy được** project này (cần backend). Dùng **Render** (file `render.yaml` có sẵn): Render → New → Blueprint → chọn repo → nhập `ADMIN_PASSWORD`, `DEMO_PASSWORD` → Deploy → nhận link `https://kwihh-project.onrender.com`. Railway/Fly/VPS cũng chạy bằng `node server/index.js`.
3. ⚠️ Gói free của Render có ổ đĩa tạm: **dữ liệu và file upload mất khi redeploy/restart**. Muốn bền: gói trả phí + Disk (`DATA_DIR=/var/data`) hoặc VPS.
4. Luôn dùng HTTPS (cookie tự thêm `Secure` khi `NODE_ENV=production`), đặt `TRUST_PROXY=1` sau proxy.

## Bảo mật
scrypt + salt · session token ngẫu nhiên (chỉ lưu hash) · cookie HttpOnly/SameSite=Strict/Secure · rate limit login · lỗi login thống nhất · validator ở backend · CSP + escape XSS · API chỉ nhận JSON + kiểm tra Origin · phân quyền user/admin ở backend · giao dịch atomic (rollback khi lỗi) · không âm số dư · chống path traversal (file chỉ do resolver dựng) · mọi biến động tiền có `transactions`, thao tác admin có `admin_logs`.

## Hạn chế đã biết
Frontend là JS thuần (ES modules) chứ chưa phải React/TypeScript; lưu trữ là JSON file (phù hợp quy mô nhỏ, đổi sang SQLite/Postgres bằng cách thay `server/lib/store.js`); router dùng hash (`#/admin/bank`).
