package com.techres.ccb.data.mock

import com.techres.ccb.domain.model.*

object FoodOrderMockData {

    /**
     * Mock data cho đơn hàng từ các app food
     */
    val foodOrders = listOf(
        // ===== ĐƠN MỚI (NEW) =====
        FoodAppOrder(
            id = "food_001",
            orderCode = "#GR78452",
            platform = FoodPlatform.GRAB_FOOD,
            status = FoodOrderStatus.NEW,
            customerName = "Nguyễn Văn Minh",
            customerPhone = "0901234567",
            customerAddress = "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
            customerNote = "Gọi trước khi giao 5 phút",
            items = listOf(
                FoodOrderItem(
                    productName = "Phở bò tái",
                    quantity = 2,
                    unitPrice = 55000,
                    totalPrice = 110000,
                    note = "Không hành, nhiều giá"
                ),
                FoodOrderItem(
                    productName = "Cafe sữa đá",
                    quantity = 2,
                    unitPrice = 25000,
                    totalPrice = 50000,
                    options = "Size M, Ít đường"
                )
            ),
            subtotal = 160000,
            deliveryFee = 15000,
            platformFee = 8000,
            discount = 20000,
            totalAmount = 163000,
            estimatedDeliveryTime = "20-25 phút",
            isPaid = true,
            paymentMethod = "Ví GrabPay",
            createdAt = System.currentTimeMillis() - 2 * 60 * 1000  // 2 phút trước
        ),

        FoodAppOrder(
            id = "food_002",
            orderCode = "#SF12398",
            platform = FoodPlatform.SHOPEE_FOOD,
            status = FoodOrderStatus.NEW,
            customerName = "Trần Thị Lan",
            customerPhone = "0912345678",
            customerAddress = "456 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM",
            customerNote = null,
            items = listOf(
                FoodOrderItem(
                    productName = "Cơm sườn nướng",
                    quantity = 1,
                    unitPrice = 45000,
                    totalPrice = 45000
                ),
                FoodOrderItem(
                    productName = "Trà đào cam sả",
                    quantity = 1,
                    unitPrice = 35000,
                    totalPrice = 35000,
                    options = "Size L, 50% đường"
                )
            ),
            subtotal = 80000,
            deliveryFee = 12000,
            platformFee = 5000,
            discount = 0,
            totalAmount = 97000,
            estimatedDeliveryTime = "15-20 phút",
            isPaid = true,
            paymentMethod = "ShopeePay",
            createdAt = System.currentTimeMillis() - 5 * 60 * 1000  // 5 phút trước
        ),

        FoodAppOrder(
            id = "food_003",
            orderCode = "#BE45678",
            platform = FoodPlatform.BE_FOOD,
            status = FoodOrderStatus.NEW,
            customerName = "Lê Hoàng Nam",
            customerPhone = "0923456789",
            customerAddress = "789 Hai Bà Trưng, Quận 3, TP.HCM",
            customerNote = "Để ở cổng bảo vệ",
            items = listOf(
                FoodOrderItem(
                    productName = "Bún chả Hà Nội",
                    quantity = 3,
                    unitPrice = 45000,
                    totalPrice = 135000,
                    note = "Chia 3 hộp riêng"
                )
            ),
            subtotal = 135000,
            deliveryFee = 18000,
            platformFee = 7000,
            discount = 15000,
            totalAmount = 145000,
            estimatedDeliveryTime = "25-30 phút",
            isPaid = false,
            paymentMethod = "Tiền mặt (COD)",
            createdAt = System.currentTimeMillis() - 1 * 60 * 1000  // 1 phút trước
        ),

        // ===== ĐÃ NHẬN (ACCEPTED) =====
        FoodAppOrder(
            id = "food_004",
            orderCode = "#GR78123",
            platform = FoodPlatform.GRAB_FOOD,
            status = FoodOrderStatus.ACCEPTED,
            customerName = "Phạm Thị Hoa",
            customerPhone = "0934567890",
            customerAddress = "321 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM",
            customerNote = null,
            items = listOf(
                FoodOrderItem(
                    productName = "Mì Ý sốt bò bằm",
                    quantity = 2,
                    unitPrice = 65000,
                    totalPrice = 130000
                ),
                FoodOrderItem(
                    productName = "Sinh tố bơ",
                    quantity = 2,
                    unitPrice = 38000,
                    totalPrice = 76000,
                    options = "Size L"
                )
            ),
            subtotal = 206000,
            deliveryFee = 20000,
            platformFee = 10000,
            discount = 30000,
            totalAmount = 206000,
            driverName = "Nguyễn Văn Tài",
            driverPhone = "0945678901",
            estimatedDeliveryTime = "15 phút",
            isPaid = true,
            paymentMethod = "Ví GrabPay",
            createdAt = System.currentTimeMillis() - 10 * 60 * 1000,
            acceptedAt = System.currentTimeMillis() - 8 * 60 * 1000
        ),

        // ===== ĐANG LÀM (PREPARING) =====
        FoodAppOrder(
            id = "food_005",
            orderCode = "#SF45612",
            platform = FoodPlatform.SHOPEE_FOOD,
            status = FoodOrderStatus.PREPARING,
            customerName = "Võ Minh Tuấn",
            customerPhone = "0956789012",
            customerAddress = "567 Cách Mạng Tháng 8, Quận 10, TP.HCM",
            customerNote = "Tầng 5, phòng 502",
            items = listOf(
                FoodOrderItem(
                    productName = "Combo Gia đình",
                    quantity = 1,
                    unitPrice = 199000,
                    totalPrice = 199000,
                    note = "2 Phở + 2 Cơm + 4 Nước"
                )
            ),
            subtotal = 199000,
            deliveryFee = 25000,
            platformFee = 12000,
            discount = 40000,
            totalAmount = 196000,
            driverName = "Trần Văn Bình",
            driverPhone = "0967890123",
            estimatedDeliveryTime = "10 phút",
            isPaid = true,
            paymentMethod = "ShopeePay",
            createdAt = System.currentTimeMillis() - 15 * 60 * 1000,
            acceptedAt = System.currentTimeMillis() - 12 * 60 * 1000,
            preparedAt = null
        ),

        FoodAppOrder(
            id = "food_006",
            orderCode = "#WEB0089",
            platform = FoodPlatform.WEB_ORDER,
            status = FoodOrderStatus.PREPARING,
            customerName = "Đặng Thu Hà",
            customerPhone = "0978901234",
            customerAddress = "234 Nguyễn Thị Minh Khai, Quận 3, TP.HCM",
            customerNote = null,
            items = listOf(
                FoodOrderItem(
                    productName = "Phở gà",
                    quantity = 1,
                    unitPrice = 50000,
                    totalPrice = 50000
                ),
                FoodOrderItem(
                    productName = "Bánh flan",
                    quantity = 2,
                    unitPrice = 20000,
                    totalPrice = 40000
                ),
                FoodOrderItem(
                    productName = "Trà sữa trân châu",
                    quantity = 1,
                    unitPrice = 35000,
                    totalPrice = 35000,
                    options = "Size L, 70% đường, Trân châu đen"
                )
            ),
            subtotal = 125000,
            deliveryFee = 15000,
            platformFee = 0,
            discount = 10000,
            totalAmount = 130000,
            estimatedDeliveryTime = "20 phút",
            isPaid = true,
            paymentMethod = "Chuyển khoản",
            createdAt = System.currentTimeMillis() - 20 * 60 * 1000,
            acceptedAt = System.currentTimeMillis() - 18 * 60 * 1000
        ),

        // ===== SẴN SÀNG (READY) =====
        FoodAppOrder(
            id = "food_007",
            orderCode = "#GR77889",
            platform = FoodPlatform.GRAB_FOOD,
            status = FoodOrderStatus.READY,
            customerName = "Hoàng Văn Đức",
            customerPhone = "0989012345",
            customerAddress = "890 Võ Văn Tần, Quận 3, TP.HCM",
            customerNote = null,
            items = listOf(
                FoodOrderItem(
                    productName = "Cafe đen đá",
                    quantity = 3,
                    unitPrice = 20000,
                    totalPrice = 60000
                ),
                FoodOrderItem(
                    productName = "Bánh mì thịt",
                    quantity = 3,
                    unitPrice = 25000,
                    totalPrice = 75000
                )
            ),
            subtotal = 135000,
            deliveryFee = 12000,
            platformFee = 7000,
            discount = 0,
            totalAmount = 154000,
            driverName = "Lê Văn Cường",
            driverPhone = "0990123456",
            estimatedDeliveryTime = "5 phút",
            isPaid = true,
            paymentMethod = "Momo",
            createdAt = System.currentTimeMillis() - 25 * 60 * 1000,
            acceptedAt = System.currentTimeMillis() - 22 * 60 * 1000,
            preparedAt = System.currentTimeMillis() - 5 * 60 * 1000
        ),

        // ===== ĐANG GIAO (DELIVERING) =====
        FoodAppOrder(
            id = "food_008",
            orderCode = "#SF33445",
            platform = FoodPlatform.SHOPEE_FOOD,
            status = FoodOrderStatus.DELIVERING,
            customerName = "Nguyễn Thị Mai",
            customerPhone = "0901122334",
            customerAddress = "456 Lý Tự Trọng, Quận 1, TP.HCM",
            customerNote = null,
            items = listOf(
                FoodOrderItem(
                    productName = "Cơm gà xối mỡ",
                    quantity = 2,
                    unitPrice = 50000,
                    totalPrice = 100000
                )
            ),
            subtotal = 100000,
            deliveryFee = 10000,
            platformFee = 5000,
            discount = 15000,
            totalAmount = 100000,
            driverName = "Phan Văn Hùng",
            driverPhone = "0912233445",
            estimatedDeliveryTime = "3 phút",
            isPaid = true,
            paymentMethod = "ShopeePay",
            createdAt = System.currentTimeMillis() - 30 * 60 * 1000,
            acceptedAt = System.currentTimeMillis() - 27 * 60 * 1000,
            preparedAt = System.currentTimeMillis() - 10 * 60 * 1000
        ),

        // ===== HOÀN THÀNH (COMPLETED) =====
        FoodAppOrder(
            id = "food_009",
            orderCode = "#GR66778",
            platform = FoodPlatform.GRAB_FOOD,
            status = FoodOrderStatus.COMPLETED,
            customerName = "Trần Văn Phú",
            customerPhone = "0923344556",
            customerAddress = "123 Pasteur, Quận 3, TP.HCM",
            customerNote = null,
            items = listOf(
                FoodOrderItem(
                    productName = "Phở bò chín",
                    quantity = 1,
                    unitPrice = 55000,
                    totalPrice = 55000
                ),
                FoodOrderItem(
                    productName = "Nước ép cam",
                    quantity = 1,
                    unitPrice = 30000,
                    totalPrice = 30000
                )
            ),
            subtotal = 85000,
            deliveryFee = 12000,
            platformFee = 5000,
            discount = 0,
            totalAmount = 102000,
            driverName = "Võ Văn An",
            driverPhone = "0934455667",
            isPaid = true,
            paymentMethod = "Ví GrabPay",
            createdAt = System.currentTimeMillis() - 60 * 60 * 1000,
            acceptedAt = System.currentTimeMillis() - 57 * 60 * 1000,
            preparedAt = System.currentTimeMillis() - 45 * 60 * 1000,
            completedAt = System.currentTimeMillis() - 35 * 60 * 1000
        ),

        // ===== ĐÃ HỦY (CANCELLED) =====
        FoodAppOrder(
            id = "food_010",
            orderCode = "#BE11223",
            platform = FoodPlatform.BE_FOOD,
            status = FoodOrderStatus.CANCELLED,
            customerName = "Lý Văn Khoa",
            customerPhone = "0945566778",
            customerAddress = "789 Nam Kỳ Khởi Nghĩa, Quận 3, TP.HCM",
            customerNote = null,
            items = listOf(
                FoodOrderItem(
                    productName = "Combo 1: Phở + Cafe",
                    quantity = 2,
                    unitPrice = 70000,
                    totalPrice = 140000
                )
            ),
            subtotal = 140000,
            deliveryFee = 15000,
            platformFee = 7000,
            discount = 0,
            totalAmount = 162000,
            isPaid = false,
            paymentMethod = "Tiền mặt (COD)",
            createdAt = System.currentTimeMillis() - 90 * 60 * 1000
        )
    )

    // ===== HELPER FUNCTIONS =====

    fun getOrdersByStatus(status: FoodOrderStatus): List<FoodAppOrder> {
        return foodOrders.filter { it.status == status }
    }

    fun getOrdersByPlatform(platform: FoodPlatform): List<FoodAppOrder> {
        return foodOrders.filter { it.platform == platform }
    }

    fun getNewOrdersCount(): Int {
        return foodOrders.count { it.status == FoodOrderStatus.NEW }
    }

    fun getProcessingOrdersCount(): Int {
        return foodOrders.count {
            it.status in listOf(
                FoodOrderStatus.ACCEPTED,
                FoodOrderStatus.PREPARING,
                FoodOrderStatus.READY,
                FoodOrderStatus.DELIVERING
            )
        }
    }

    fun getFilteredOrders(filter: FoodOrderFilter): List<FoodAppOrder> {
        return when (filter) {
            FoodOrderFilter.ALL -> foodOrders
            FoodOrderFilter.NEW -> foodOrders.filter { it.status == FoodOrderStatus.NEW }
            FoodOrderFilter.PROCESSING -> foodOrders.filter {
                it.status in listOf(
                    FoodOrderStatus.ACCEPTED,
                    FoodOrderStatus.PREPARING,
                    FoodOrderStatus.READY,
                    FoodOrderStatus.DELIVERING
                )
            }
            FoodOrderFilter.COMPLETED -> foodOrders.filter { it.status == FoodOrderStatus.COMPLETED }
            FoodOrderFilter.CANCELLED -> foodOrders.filter { it.status == FoodOrderStatus.CANCELLED }
        }
    }

    fun getOrderById(orderId: String): FoodAppOrder? {
        return foodOrders.find { it.id == orderId }
    }
}
