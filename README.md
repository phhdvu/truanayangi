# Trưa nay ăn gì?

App chọn bữa trưa nội bộ bằng **Next.js App Router + TypeScript + shadcn/ui + Tailwind CSS**. Giao diện tiếng Việt, font Be Vietnam Pro được phục vụ từ app. Chuẩn bị để deploy lên Vercel.

## Luồng sử dụng

1. Đăng nhập bằng tài khoản được cấp; lần đầu đăng nhập sẽ đổi mật khẩu riêng.
2. Tham gia một nhóm của hôm nay hoặc tạo nhóm mới. Khi tạo nhóm, trưởng nhóm chọn quán trước rồi chọn những món của quán đó được phép đặt.
3. Sau khi nhóm mở, mỗi thành viên chọn một suất riêng hoặc tự gacha một món, rồi có thể đổi món trước khi khóa đơn.
4. Người tạo nhóm là trưởng nhóm: quản lý thực đơn, đặt/gia hạn giờ khóa, khóa đơn, mở lại để chỉnh sửa hoặc xóa nhóm khi nhóm còn mở. Sau khi khóa, trưởng nhóm chọn người thanh toán toàn bộ đơn rồi bấm **Hoàn thành**; nhóm hoàn thành không thể chỉnh sửa hoặc xóa.
5. Mỗi nhóm thuộc một ngày theo giờ Việt Nam. Có thể lọc theo ngày để xem các nhóm cũ; chỉ thành viên xem được chi tiết nhóm đã khóa.
6. Bấm vào tên tài khoản ở góc phải để mở hồ sơ cá nhân. Trang này tổng hợp các suất bạn đã chọn theo tháng, năm và ngày; tổng tiền chỉ cộng những món đã có giá, còn món chưa cập nhật giá được tách riêng.

Các nhóm tách biệt thực đơn, thành viên, suất đặt và kết quả gacha cá nhân. Dữ liệu cập nhật mỗi 5 giây khi tab đang hiển thị. Gacha là gợi ý riêng cho từng người, không tự ghi đè lựa chọn.

## Chạy local

Yêu cầu Node.js 22 trở lên và pnpm 11.

```bash
pnpm install
pnpm dev
```

Mở http://localhost:3000. Khi chưa đặt `DATABASE_URL`, app chạy **demo** có nhãn rõ ràng. Dữ liệu demo chỉ lưu ở trình duyệt hiện tại, không đồng bộ giữa máy và không chuyển tự động sang database. Khi đã kết nối Supabase, app chuyển sang chế độ nội bộ và yêu cầu tài khoản được cấp sẵn. Trong chế độ nội bộ, các nhóm, thành viên, lựa chọn, gacha và lịch sử suất ăn đều được lưu ở database; `localStorage` chỉ còn là kho dữ liệu tạm cho chế độ demo.

Repo đã ghi rõ chính sách build trong `pnpm-workspace.yaml`: script native của `unrs-resolver` được từ chối có chủ đích vì đây là dependency phụ của ESLint tooling và không cần cho app chạy; pnpm sẽ không tự xóa/cài lại `node_modules` khi bạn gọi script. Nếu dependency thay đổi, chạy `pnpm install` trước rồi mới `pnpm dev`.

Nếu máy đã có một dev server của dự án đang chạy, `pnpm dev` sẽ báo cổng/project đang được dùng; mở URL server hiện tại hoặc dừng tiến trình cũ rồi chạy lại.

## Kết nối Supabase

Supabase cung cấp PostgreSQL đầy đủ cho mỗi project. App kết nối từ Route Handler ở server bằng `postgres`, vì vậy không cần đặt service key hoặc database URL vào trình duyệt. Cách này giữ được transaction và khóa dòng khi nhiều người cùng đặt món.

1. Tạo một project trên [Supabase Dashboard](https://supabase.com/dashboard).
2. Mở **Connect** ở project, chọn **Transaction pooler** rồi sao chép URI. Pooler transaction (port `6543`) phù hợp với các function chạy ngắn trên Vercel; app đã tắt prepared statements để tương thích với chế độ này.
3. Sao chép `.env.example` thành `.env.local` và dán nguyên URI vào `DATABASE_URL`:

   ```env
   DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require"
   ```

   Hãy dùng đúng URI Supabase cung cấp, giữ phần `sslmode`, và URL-encode các ký tự đặc biệt trong mật khẩu. Không đưa biến này vào `NEXT_PUBLIC_*`, không commit `.env.local`.

4. Kiểm tra kết nối và tạo bảng:

   ```bash
   pnpm db:check
   pnpm db:setup
   pnpm db:check
   ```

   Lần `db:check` trước `db:setup` có thể báo bảng chưa tồn tại; đó là trạng thái bình thường của database mới. Script `db:setup` chạy tất cả migration trong thư mục [`supabase/migrations/`](supabase/migrations/) theo thứ tự tên file, tạo các bảng nhóm, đơn cá nhân, catalog quán/món và auth, đồng thời bật Row Level Security để tránh vô tình mở bảng qua Data API. Dữ liệu hiện có được giữ nguyên nhờ `IF NOT EXISTS` và các seed catalog dùng `ON CONFLICT DO NOTHING`.

5. Cấp tài khoản cho từng đồng nghiệp từ máy quản trị hoặc máy của bạn:

   ```powershell
   pnpm user:create -- an.nguyen "Nguyễn Văn An"
   pnpm user:create -- binh.tran "Trần Minh Bình"
   ```

   Mỗi tài khoản được tạo với mật khẩu mặc định `@DST123` và cờ bắt buộc đổi mật khẩu. Script chỉ lưu password hash, không lưu mật khẩu thô. Không chạy lệnh này từ trình duyệt hay đưa danh sách tài khoản vào git.

6. Chạy `pnpm dev` và đăng nhập bằng một tài khoản vừa cấp. Lần đầu đăng nhập sẽ dừng ở màn hình đổi mật khẩu; sau khi đổi xong người dùng mới vào được danh sách nhóm.

Nếu muốn chạy migration trực tiếp trong Supabase, mở **SQL Editor**, dán lần lượt nội dung các file trong [`supabase/migrations/`](supabase/migrations/) theo thứ tự tên file rồi bấm **Run**. Migration catalog sẽ tạo `public.restaurants` và `public.dishes`, đồng thời thêm quán Cơm anh Thắng cùng bốn món ban đầu. App dùng auth nội bộ ở Route Handler, không dùng Supabase Auth hay Data API cho đăng nhập. Session được lưu dưới dạng hash trong `public.auth_sessions`, còn cookie trình duyệt là HttpOnly và có thời hạn 7 ngày.

Mật khẩu mới không được lưu bằng MD5 + salt. MD5 là hàm băm rất nhanh, khiến việc thử hàng loạt mật khẩu trở nên dễ dàng; app dùng `scrypt` với salt ngẫu nhiên riêng cho từng tài khoản, tham số chi phí bộ nhớ/CPU và so sánh thời gian không đổi. Đây là lựa chọn phù hợp hơn cho mật khẩu mới theo [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Nếu sau này cần tương thích với một hệ thống cũ đang lưu MD5, nên làm migration riêng có kế hoạch, không dùng MD5 cho tài khoản mới.

## Deploy Vercel

1. Đưa dự án lên Git repository của bạn và import vào Vercel.
2. Dự án có `vercel.json` đặt framework **Next.js**, install command `npm ci` và build command `npm run build`. Cấu hình này dùng `package-lock.json` kể cả khi thư mục còn lockfile của package manager khác. Không dùng static export.
3. Thêm biến môi trường **DATABASE_URL** vào môi trường Production và Preview nếu cần. Dùng Transaction pooler URI của Supabase cho các function Vercel; nên dùng database riêng cho Preview để tránh sửa nhầm dữ liệu công ty.
4. Chạy `pnpm db:setup` từ local với URL database đích, hoặc chạy file migration trong Supabase SQL Editor, nếu database chưa khởi tạo.
5. Tạo tài khoản nội bộ trước khi gửi URL cho đồng nghiệp. Các tài khoản cần được tạo trên máy có `DATABASE_URL` trỏ đúng database production.
6. Deploy. Nếu đổi biến môi trường sau khi deploy, redeploy để áp dụng.
7. Kiểm tra bằng hai trình duyệt/thiết bị: đăng nhập bằng hai tài khoản khác nhau, người A tạo nhóm và chọn thực đơn, người B tham gia; mỗi người chọn hoặc gacha một suất, kiểm tra mix/đồ uống/đồ gọi thêm rồi bấm **Xác nhận món** trước khi A khóa đơn. Kiểm tra danh sách món theo từng người, chọn người thanh toán trong hộp **Hoàn thành** và xác nhận nhóm đã khóa hẳn. Kiểm tra thêm nút chỉnh sửa để mở lại nhóm trước khi hoàn thành. Các thay đổi phải xuất hiện ở máy còn lại trong khoảng 5 giây.

Không cần tạo project Sites hay lưu file database trên filesystem Vercel. Postgres giữ dữ liệu qua các lần deploy và qua nhiều server instance.

## Nhận diện và quyền

- Đây là bản nội bộ dùng tài khoản được cấp sẵn, **chưa có đăng nhập công ty/SSO**. Ai có tài khoản hợp lệ mới vào được danh sách nhóm; nếu cần tự đồng bộ tài khoản nhân sự, có thể bổ sung SSO sau.
- Cookie session HttpOnly chứa token ngẫu nhiên; database chỉ lưu SHA-256 của token và thời hạn session. Token không được trả cho client JavaScript.
- Tài khoản mới luôn có `must_change_password = true`; API nhóm từ chối thao tác cho đến khi đổi mật khẩu thành công. Đăng xuất xóa session hiện tại; đổi mật khẩu xóa các session khác của tài khoản.
- Tài khoản được cấp bằng `pnpm user:create`, chưa có giao diện quản trị tài khoản trong app. Hãy giới hạn quyền truy cập máy hoặc CI chạy lệnh này.
- Quyền trưởng nhóm được kiểm tra ở API, không chỉ ẩn nút trên giao diện. Không có mã quản trị mặc định.
- Tên hiển thị của tài khoản live lấy từ `internal_users`; người dùng không thể giả tên tài khoản khác ở API. Chế độ demo vẫn cho phép đổi tên trên trình duyệt. Xóa cookie hoặc đăng nhập máy khác không tự khôi phục quyền trưởng nhóm cũ.
- Lựa chọn của từng thành viên và kết quả gacha cá nhân được cập nhật trong transaction có `SELECT ... FOR UPDATE` để nhiều người đặt đồng thời không ghi đè mất dữ liệu của nhau. Giới hạn 200 thành viên, 30 món mỗi nhóm và 10 nhóm/người/ngày ở API.
- Catalog hiện có quán **Cơm anh Thắng** với bốn món: Cơm Gà Sốt, Cơm Bò Xào Dưa, Cơm Xá Xíu và Cơm Thịt Kho. Khi mở nhóm, trưởng nhóm chọn quán rồi chọn các món được phép đặt; giá món có thể bổ sung sau trong thực đơn của nhóm.

## Kiểm tra

```bash
pnpm test
pnpm run lint
pnpm run typecheck
pnpm run build
```

Test nghiệp vụ kiểm tra suất đặt, phân quyền, ngày Việt Nam, giờ khóa, gacha cá nhân, hoàn thành đơn và tính nhất quán khi thay đổi món. Cần kết nối PostgreSQL thật để kiểm tra tích hợp nhiều thiết bị; test nghiệp vụ không thay thế bước này.

## Các phần chính

- `src/components/lunch-app.tsx`: đăng nhập, danh sách nhóm, phòng đặt món, gacha cá nhân và các form quản lý nhóm.
- `src/components/profile-page.tsx`: hồ sơ cá nhân với tổng tiền, số suất, trung bình mỗi bữa và lịch sử theo tháng/năm/ngày.
- `src/components/ui/`: component được thêm bằng CLI shadcn chính thức.
- `src/lib/lunch.ts`: kiểu dữ liệu và quy tắc nhóm dùng chung cho demo/server.
- `src/lib/spending.ts`: chuyển lựa chọn cá nhân thành các mục chi tiêu và gom nhóm theo thời gian.
- `src/app/api/groups/route.ts`: API nhóm, xác thực phiên, validation và transaction.
- `src/app/api/stats/route.ts`: API thống kê chi tiêu riêng cho tài khoản đang đăng nhập.
- `src/app/api/auth/`: đăng nhập, đổi mật khẩu, session và đăng xuất.
- `src/lib/db.ts`: kết nối PostgreSQL có pooling giới hạn cho serverless.
- `src/lib/auth.ts`: session cookie, truy vấn tài khoản và kiểm tra nguồn request.
- `src/lib/password.ts`: scrypt + salt ngẫu nhiên và so sánh constant-time.
- `scripts/check-db.mjs`: kiểm tra kết nối Supabase và trạng thái bảng.
- `scripts/setup-db.mjs`: chạy tất cả migration trong `supabase/migrations/` theo thứ tự.
- `scripts/create-user.mjs`: cấp tài khoản nội bộ với mật khẩu mặc định.
- `supabase/migrations/20260909000000_create_lunch_groups.sql`: schema PostgreSQL dùng cho Supabase.
- `supabase/migrations/20260910000000_create_restaurant_catalog.sql`: schema và dữ liệu khởi tạo catalog quán/món.
- `supabase/migrations/20260910010000_add_lunch_group_member_index.sql`: index JSONB cho truy vấn lịch sử theo thành viên.
- `supabase/migrations/20260910020000_create_lunch_orders.sql`: bảng snapshot suất ăn cá nhân và backfill lựa chọn cũ từ nhóm.
- `supabase/migrations/20260910030000_add_completed_order_status.sql`: thêm trạng thái hoàn thành cho sổ đơn lâu dài.
- `supabase/migrations/20260910040000_add_order_payer.sql`: lưu người thanh toán cùng mỗi suất để lịch sử cá nhân biết cần hoàn tiền cho ai.
- `tests/lunch.test.ts`: test nghiệp vụ.

Tham khảo: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [shadcn/ui](https://ui.shadcn.com/docs/cli), [cấu hình Vercel](https://vercel.com/docs/project-configuration/vercel-json).
