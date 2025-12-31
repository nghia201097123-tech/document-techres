---
sidebar_position: 1
slug: /
---

# Giới thiệu FNB POS System

Chào mừng bạn đến với tài liệu kỹ thuật của **Hệ thống POS F&B Offline-First** - giải pháp quản lý bán hàng toàn diện cho ngành F&B.

## Tổng quan

FNB POS System là hệ thống bán hàng được thiết kế với cơ chế **Offline-First**, hỗ trợ 2 mô hình kinh doanh:

| Mô hình | Đối tượng | Thiết bị sử dụng |
|---------|-----------|------------------|
| **Quán nhỏ** | 1-2 nhân viên, quán cafe, trà sữa nhỏ | Chỉ dùng điện thoại (Order App chế độ Standalone) |
| **Quán lớn** | Nhiều nhân viên, nhà hàng, quán lớn | Điện thoại (Order App) + Máy POS (CCB) + Màn hình bếp |

## Các thành phần hệ thống

| Thành phần | Nền tảng | Vai trò |
|------------|----------|---------|
| **Web Admin** | React/Next.js | Super Admin - Tạo quán mới, quản lý tài khoản owner, billing |
| **Web Dashboard** | React/Next.js | Chủ quán - Xây dựng menu, bàn, nhân viên, xem báo cáo |
| **CCB App (Thu ngân)** | React Native | Thu ngân, thanh toán, in bill, đóng vai trò Local API Server |
| **CCB App (Bếp/Bar)** | React Native | Hiển thị món cần làm, in tem bếp, đánh dấu hoàn thành |
| **Order App** | React Native | Nhân viên order món - 2 chế độ: Standalone và Client |
| **Customer App** | React Native/Web | Khách hàng xem điểm, lịch sử (Online only) |

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEB ADMIN (Super Admin)                    │
│                    Quản lý toàn bộ hệ thống                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Tạo quán + cấp tài khoản
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WEB DASHBOARD (Chủ quán/Owner)                │
│                     Quản lý 1 quán cụ thể                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Sync data xuống thiết bị
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              CỬA HÀNG (CCB + Order App + Bếp/Bar)               │
│                     Hoạt động Offline-First                     │
└─────────────────────────────────────────────────────────────────┘
```

## Tính năng chính

### Offline-First
- Mọi tính năng core hoạt động không cần internet
- Tự động đồng bộ khi có mạng
- Xử lý conflict thông minh

### Đa thiết bị
- Hỗ trợ Android, iOS, Windows
- Kết nối qua mạng LAN/WiFi
- Auto-discovery thiết bị

### Hệ thống in ấn
- In bill, tem bếp/bar
- Hỗ trợ Bluetooth, USB, WiFi/LAN
- Print Queue đảm bảo không miss lệnh in

### Quản lý tập trung
- Web Admin quản lý tất cả quán
- Web Dashboard cho từng chủ quán
- Báo cáo doanh thu realtime

## Bắt đầu nhanh

1. **[Tổng quan kiến trúc](/docs/architecture/overview)** - Hiểu cách hệ thống hoạt động
2. **[Hướng dẫn cài đặt](/docs/guides/getting-started)** - Thiết lập môi trường phát triển
3. **[API Reference](/docs/api/overview)** - Tài liệu API chi tiết

## Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| Web Dashboard | React/Next.js + TypeScript |
| Server API | Node.js + Express/Fastify |
| Database Server | PostgreSQL + Prisma |
| Mobile Apps | React Native |
| Local DB | SQLite |
| State Management | Zustand |
| WebSocket | Socket.io |
| Print | ESC/POS Protocol |
