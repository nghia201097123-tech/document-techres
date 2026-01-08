package com.techres.ccb.data.mock

import com.techres.ccb.domain.model.*

object MockData {

    // ===== CATEGORIES =====
    val categories = listOf(
        Category(id = "all", name = "Tất cả", icon = "🏷️", order = 0),
        Category(id = "cat_drink", name = "Đồ uống", icon = "☕", order = 1),
        Category(id = "cat_food", name = "Đồ ăn", icon = "🍜", order = 2),
        Category(id = "cat_dessert", name = "Tráng miệng", icon = "🍰", order = 3),
        Category(id = "cat_combo", name = "Combo", icon = "🎁", order = 4),
        Category(id = "cat_other", name = "Khác", icon = "📦", order = 5)
    )

    // ===== VARIANT TEMPLATES =====
    private val sizeVariants = ProductVariantGroup(
        id = "var_size",
        name = "Size",
        type = VariantType.SIZE,
        isRequired = true,
        options = listOf(
            ProductVariantOption(id = "size_s", name = "S", price = -5000),
            ProductVariantOption(id = "size_m", name = "M", price = 0, isDefault = true),
            ProductVariantOption(id = "size_l", name = "L", price = 5000),
            ProductVariantOption(id = "size_xl", name = "XL", price = 10000)
        )
    )

    private val sugarVariants = ProductVariantGroup(
        id = "var_sugar",
        name = "Đường",
        type = VariantType.SUGAR,
        isRequired = false,
        options = listOf(
            ProductVariantOption(id = "sugar_0", name = "Không đường", price = 0),
            ProductVariantOption(id = "sugar_30", name = "30%", price = 0),
            ProductVariantOption(id = "sugar_50", name = "50%", price = 0, isDefault = true),
            ProductVariantOption(id = "sugar_70", name = "70%", price = 0),
            ProductVariantOption(id = "sugar_100", name = "100%", price = 0)
        )
    )

    private val iceVariants = ProductVariantGroup(
        id = "var_ice",
        name = "Đá",
        type = VariantType.ICE,
        isRequired = false,
        options = listOf(
            ProductVariantOption(id = "ice_0", name = "Không đá", price = 0),
            ProductVariantOption(id = "ice_less", name = "Ít đá", price = 0),
            ProductVariantOption(id = "ice_normal", name = "Bình thường", price = 0, isDefault = true),
            ProductVariantOption(id = "ice_more", name = "Nhiều đá", price = 0)
        )
    )

    private val toppingVariants = ProductVariantGroup(
        id = "var_topping",
        name = "Topping",
        type = VariantType.TOPPING,
        isRequired = false,
        isMultiple = true,
        options = listOf(
            ProductVariantOption(id = "top_tran_chau", name = "Trân châu đen", price = 10000),
            ProductVariantOption(id = "top_tran_chau_trang", name = "Trân châu trắng", price = 10000),
            ProductVariantOption(id = "top_thach", name = "Thạch", price = 8000),
            ProductVariantOption(id = "top_pudding", name = "Pudding", price = 10000),
            ProductVariantOption(id = "top_kem_cheese", name = "Kem cheese", price = 15000),
            ProductVariantOption(id = "top_shot_espresso", name = "Shot Espresso", price = 12000)
        )
    )

    private val drinkVariants = listOf(sizeVariants, sugarVariants, iceVariants, toppingVariants)

    // ===== PRODUCTS =====
    val products = listOf(
        // ===== ĐỒ UỐNG =====
        Product(
            id = "prod_001",
            code = "CF001",
            name = "Cafe sữa đá",
            categoryId = "cat_drink",
            price = 25000,
            description = "Cafe sữa truyền thống, đậm đà hương vị",
            soldCount = 152,
            hasVariants = true,
            variants = drinkVariants
        ),
        Product(
            id = "prod_002",
            code = "CF002",
            name = "Cafe đen đá",
            categoryId = "cat_drink",
            price = 20000,
            description = "Cafe đen nguyên chất, đắng nhẹ",
            soldCount = 98,
            hasVariants = true,
            variants = drinkVariants
        ),
        Product(
            id = "prod_003",
            code = "CF003",
            name = "Bạc xỉu",
            categoryId = "cat_drink",
            price = 28000,
            description = "Cafe pha sữa đặc, ngọt béo",
            soldCount = 87,
            hasVariants = true,
            variants = drinkVariants
        ),
        Product(
            id = "prod_004",
            code = "TR001",
            name = "Trà đào cam sả",
            categoryId = "cat_drink",
            price = 35000,
            description = "Trà đào thơm mát với cam và sả",
            soldCount = 134,
            hasVariants = true,
            variants = drinkVariants
        ),
        Product(
            id = "prod_005",
            code = "TR002",
            name = "Trà vải",
            categoryId = "cat_drink",
            price = 32000,
            description = "Trà vải tươi mát",
            soldCount = 76,
            hasVariants = true,
            variants = drinkVariants
        ),
        Product(
            id = "prod_006",
            code = "TR003",
            name = "Trà sữa trân châu",
            categoryId = "cat_drink",
            price = 35000,
            description = "Trà sữa với trân châu đường đen",
            soldCount = 189,
            hasVariants = true,
            variants = drinkVariants
        ),
        Product(
            id = "prod_007",
            code = "ST001",
            name = "Sinh tố bơ",
            categoryId = "cat_drink",
            price = 38000,
            description = "Sinh tố bơ béo ngậy",
            soldCount = 65,
            hasVariants = true,
            variants = listOf(sizeVariants)
        ),
        Product(
            id = "prod_008",
            code = "ST002",
            name = "Sinh tố xoài",
            categoryId = "cat_drink",
            price = 35000,
            description = "Sinh tố xoài tươi mát",
            soldCount = 54,
            hasVariants = true,
            variants = listOf(sizeVariants)
        ),
        Product(
            id = "prod_009",
            code = "NC001",
            name = "Nước ép cam",
            categoryId = "cat_drink",
            price = 30000,
            description = "Nước cam tươi nguyên chất",
            soldCount = 82,
            hasVariants = true,
            variants = listOf(sizeVariants)
        ),
        Product(
            id = "prod_010",
            code = "NC002",
            name = "Nước ép dưa hấu",
            categoryId = "cat_drink",
            price = 28000,
            description = "Nước dưa hấu tươi mát",
            soldCount = 45,
            hasVariants = true,
            variants = listOf(sizeVariants)
        ),

        // ===== ĐỒ ĂN =====
        Product(
            id = "prod_020",
            code = "PH001",
            name = "Phở bò tái",
            categoryId = "cat_food",
            price = 55000,
            description = "Phở bò truyền thống với thịt bò tái",
            soldCount = 145,
            hasVariants = false
        ),
        Product(
            id = "prod_021",
            code = "PH002",
            name = "Phở bò chín",
            categoryId = "cat_food",
            price = 55000,
            description = "Phở bò với thịt bò chín nạm",
            soldCount = 98,
            hasVariants = false
        ),
        Product(
            id = "prod_022",
            code = "PH003",
            name = "Phở gà",
            categoryId = "cat_food",
            price = 50000,
            description = "Phở gà ta thơm ngon",
            soldCount = 76,
            hasVariants = false
        ),
        Product(
            id = "prod_023",
            code = "BM001",
            name = "Bánh mì thịt",
            categoryId = "cat_food",
            price = 25000,
            description = "Bánh mì kẹp thịt nguội, pate, rau",
            soldCount = 234,
            hasVariants = false
        ),
        Product(
            id = "prod_024",
            code = "BM002",
            name = "Bánh mì ốp la",
            categoryId = "cat_food",
            price = 30000,
            description = "Bánh mì với trứng ốp la",
            soldCount = 156,
            hasVariants = false
        ),
        Product(
            id = "prod_025",
            code = "CS001",
            name = "Cơm sườn",
            categoryId = "cat_food",
            price = 45000,
            description = "Cơm sườn nướng với đồ chua",
            soldCount = 112,
            hasVariants = false
        ),
        Product(
            id = "prod_026",
            code = "CS002",
            name = "Cơm gà xối mỡ",
            categoryId = "cat_food",
            price = 50000,
            description = "Cơm gà da giòn xối mỡ",
            soldCount = 89,
            hasVariants = false
        ),
        Product(
            id = "prod_027",
            code = "BC001",
            name = "Bún chả Hà Nội",
            categoryId = "cat_food",
            price = 45000,
            description = "Bún chả với thịt nướng than hoa",
            soldCount = 167,
            hasVariants = false
        ),
        Product(
            id = "prod_028",
            code = "MY001",
            name = "Mì Ý sốt bò bằm",
            categoryId = "cat_food",
            price = 65000,
            description = "Mì Ý với sốt bò bằm đậm đà",
            soldCount = 78,
            hasVariants = false
        ),

        // ===== TRÁNG MIỆNG =====
        Product(
            id = "prod_040",
            code = "BF001",
            name = "Bánh flan",
            categoryId = "cat_dessert",
            price = 20000,
            description = "Bánh flan mềm mịn",
            soldCount = 92,
            hasVariants = false
        ),
        Product(
            id = "prod_041",
            code = "CH001",
            name = "Chè thái",
            categoryId = "cat_dessert",
            price = 25000,
            description = "Chè thái đầy đủ topping",
            soldCount = 65,
            hasVariants = false
        ),
        Product(
            id = "prod_042",
            code = "KM001",
            name = "Kem vanilla",
            categoryId = "cat_dessert",
            price = 25000,
            description = "Kem vanilla tươi mát",
            soldCount = 54,
            hasVariants = false
        ),
        Product(
            id = "prod_043",
            code = "KM002",
            name = "Kem chocolate",
            categoryId = "cat_dessert",
            price = 28000,
            description = "Kem chocolate đậm đà",
            soldCount = 67,
            hasVariants = false
        ),

        // ===== COMBO =====
        Product(
            id = "prod_060",
            code = "CB001",
            name = "Combo 1: Phở + Cafe",
            categoryId = "cat_combo",
            price = 70000,
            description = "1 Phở bò tái + 1 Cafe sữa đá",
            soldCount = 89,
            hasVariants = false
        ),
        Product(
            id = "prod_061",
            code = "CB002",
            name = "Combo 2: Cơm + Trà",
            categoryId = "cat_combo",
            price = 65000,
            description = "1 Cơm sườn + 1 Trà đào",
            soldCount = 76,
            hasVariants = false
        ),
        Product(
            id = "prod_062",
            code = "CB003",
            name = "Combo Gia đình",
            categoryId = "cat_combo",
            price = 199000,
            description = "2 Phở + 2 Cơm + 4 Nước",
            soldCount = 34,
            hasVariants = false
        )
    )

    // ===== TABLES =====
    val tables = listOf(
        // Tầng 1
        Table(id = "tbl_01", name = "01", areaId = "area_1", areaName = "Tầng 1", capacity = 2, status = TableStatus.AVAILABLE),
        Table(id = "tbl_02", name = "02", areaId = "area_1", areaName = "Tầng 1", capacity = 4, status = TableStatus.OCCUPIED, currentOrderAmount = 125000, occupiedMinutes = 45),
        Table(id = "tbl_03", name = "03", areaId = "area_1", areaName = "Tầng 1", capacity = 4, status = TableStatus.AVAILABLE),
        Table(id = "tbl_04", name = "04", areaId = "area_1", areaName = "Tầng 1", capacity = 4, status = TableStatus.RESERVED),
        Table(id = "tbl_05", name = "05", areaId = "area_1", areaName = "Tầng 1", capacity = 2, status = TableStatus.OCCUPIED, currentOrderAmount = 89000, occupiedMinutes = 30),
        Table(id = "tbl_06", name = "06", areaId = "area_1", areaName = "Tầng 1", capacity = 6, status = TableStatus.OCCUPIED, currentOrderAmount = 210000, occupiedMinutes = 15),
        Table(id = "tbl_07", name = "VIP 1", areaId = "area_1", areaName = "Tầng 1", capacity = 10, status = TableStatus.OCCUPIED, currentOrderAmount = 450000, occupiedMinutes = 60),
        Table(id = "tbl_08", name = "08", areaId = "area_1", areaName = "Tầng 1", capacity = 4, status = TableStatus.CLEANING),

        // Tầng 2
        Table(id = "tbl_09", name = "09", areaId = "area_2", areaName = "Tầng 2", capacity = 4, status = TableStatus.AVAILABLE),
        Table(id = "tbl_10", name = "10", areaId = "area_2", areaName = "Tầng 2", capacity = 4, status = TableStatus.AVAILABLE),
        Table(id = "tbl_11", name = "11", areaId = "area_2", areaName = "Tầng 2", capacity = 6, status = TableStatus.OCCUPIED, currentOrderAmount = 156000, occupiedMinutes = 25),
        Table(id = "tbl_12", name = "VIP 2", areaId = "area_2", areaName = "Tầng 2", capacity = 12, status = TableStatus.RESERVED)
    )

    // ===== CUSTOMERS =====
    val customers = listOf(
        Customer(
            id = "cus_001",
            name = "Nguyễn Văn A",
            phone = "0901234567",
            email = "nguyenvana@email.com",
            memberLevel = "Vàng",
            points = 1250,
            totalSpent = 5250000
        ),
        Customer(
            id = "cus_002",
            name = "Trần Thị B",
            phone = "0912345678",
            email = "tranthib@email.com",
            memberLevel = "Bạc",
            points = 680,
            totalSpent = 2800000
        ),
        Customer(
            id = "cus_003",
            name = "Lê Văn C",
            phone = "0923456789",
            email = "levanc@email.com",
            memberLevel = "Đồng",
            points = 320,
            totalSpent = 1200000
        )
    )

    // ===== HELPER FUNCTIONS =====
    fun getProductsByCategory(categoryId: String): List<Product> {
        return if (categoryId == "all") {
            products.filter { it.isActive }
        } else {
            products.filter { it.categoryId == categoryId && it.isActive }
        }
    }

    fun searchProducts(query: String): List<Product> {
        val lowerQuery = query.lowercase()
        return products.filter {
            it.isActive && (
                it.name.lowercase().contains(lowerQuery) ||
                it.code.lowercase().contains(lowerQuery)
            )
        }
    }

    fun getProductById(productId: String): Product? {
        return products.find { it.id == productId }
    }

    fun getTablesByArea(areaId: String): List<Table> {
        return tables.filter { it.areaId == areaId }
    }

    fun getAvailableTables(): List<Table> {
        return tables.filter { it.status == TableStatus.AVAILABLE }
    }

    fun generateOrderNumber(): String {
        val timestamp = System.currentTimeMillis()
        return "#${(timestamp % 10000).toString().padStart(4, '0')}"
    }
}
