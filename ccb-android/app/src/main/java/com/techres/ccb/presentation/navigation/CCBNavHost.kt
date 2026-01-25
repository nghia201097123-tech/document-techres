package com.techres.ccb.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.techres.ccb.presentation.screens.auth.LoginScreen
import com.techres.ccb.presentation.screens.auth.PinScreen
import com.techres.ccb.presentation.screens.branch.BranchSelectionScreen
import com.techres.ccb.presentation.screens.closeshift.CloseShiftScreen
import com.techres.ccb.presentation.screens.dashboard.DashboardScreen
import com.techres.ccb.presentation.screens.foodorder.FoodOrderScreen
import com.techres.ccb.presentation.screens.home.HomeScreen
import com.techres.ccb.presentation.screens.menu.MenuScreen
import com.techres.ccb.presentation.screens.openshift.OpenShiftScreen
import com.techres.ccb.presentation.screens.order.OrderScreen
import com.techres.ccb.presentation.screens.payment.PaymentScreen
import com.techres.ccb.presentation.screens.sale.SaleScreen
import com.techres.ccb.presentation.screens.settings.SettingsScreen
import com.techres.ccb.presentation.screens.settings.KitchenPrinterScreen
import com.techres.ccb.presentation.screens.settings.BillPrinterConfigScreen
import com.techres.ccb.presentation.screens.settings.LabelPrinterConfigScreen
import com.techres.ccb.presentation.screens.settings.FoodPartnerConnectionScreen
import com.techres.ccb.presentation.screens.settings.AddFoodPlatformAccountScreen
import com.techres.ccb.presentation.screens.shift.ShiftScreen
import com.techres.ccb.presentation.screens.splash.SplashScreen
import com.techres.ccb.presentation.screens.sync.SyncDataScreen
import com.techres.ccb.presentation.screens.initialsync.InitialSyncScreen
import com.techres.ccb.presentation.screens.debug.DatabaseDebugScreen
import com.techres.ccb.presentation.screens.orderhistory.OrderHistoryScreen
import com.techres.ccb.presentation.screens.table.TableScreen

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Pin : Screen("pin")

    // New flow screens
    object InitialSync : Screen("initial_sync")  // Sync brands/branches after login
    object BranchSelection : Screen("branch_selection")
    object OpenShift : Screen("open_shift/{branchName}") {
        fun createRoute(branchName: String) = "open_shift/$branchName"
    }
    object SyncData : Screen("sync_data/{branchName}") {
        fun createRoute(branchName: String) = "sync_data/$branchName"
    }
    object CloseShift : Screen("close_shift")

    object Dashboard : Screen("dashboard")  // Main dashboard screen
    object Home : Screen("home")
    object Sale : Screen("sale?orderId={orderId}&tableId={tableId}&showPayment={showPayment}") {  // New POS Sale Screen
        fun createRoute(orderId: String? = null, tableId: String? = null, showPayment: Boolean = false): String {
            val params = mutableListOf<String>()
            if (orderId != null) params.add("orderId=$orderId")
            if (tableId != null) params.add("tableId=$tableId")
            if (showPayment) params.add("showPayment=true")
            return if (params.isEmpty()) "sale" else "sale?${params.joinToString("&")}"
        }
    }
    object FoodOrder : Screen("food_order")  // Food App Orders Screen
    object Menu : Screen("menu?orderId={orderId}") {
        fun createRoute(orderId: String? = null) = if (orderId != null) "menu?orderId=$orderId" else "menu"
    }
    object Order : Screen("order/{orderId}") {
        fun createRoute(orderId: String) = "order/$orderId"
    }
    object Payment : Screen("payment/{orderId}") {
        fun createRoute(orderId: String) = "payment/$orderId"
    }
    object Shift : Screen("shift")
    object Settings : Screen("settings")
    object KitchenPrinter : Screen("kitchen_printer")
    object BillPrinter : Screen("bill_printer")
    object LabelPrinter : Screen("label_printer")
    object FoodPartner : Screen("food_partner")
    object AddFoodPlatformAccount : Screen("add_food_platform_account?accountId={accountId}&platform={platform}") {
        fun createRoute(accountId: String? = null, platform: String? = null): String {
            return if (accountId != null && platform != null) {
                "add_food_platform_account?accountId=$accountId&platform=$platform"
            } else {
                "add_food_platform_account"
            }
        }
    }
    object DatabaseDebug : Screen("database_debug")
    object OrderHistory : Screen("order_history")
    object Table : Screen("table")  // Table List Screen
}

@Composable
fun CCBNavHost() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToPin = {
                    navController.navigate(Screen.Pin.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToHome = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    // After login -> Go to Initial Sync (sync brands/branches)
                    navController.navigate(Screen.InitialSync.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Pin.route) {
            PinScreen(
                onPinVerified = {
                    navController.navigate(Screen.InitialSync.route) {
                        popUpTo(Screen.Pin.route) { inclusive = true }
                    }
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Pin.route) { inclusive = true }
                    }
                }
            )
        }

        // Initial Sync Screen - Sync brands/branches after login
        composable(Screen.InitialSync.route) {
            InitialSyncScreen(
                onSyncComplete = {
                    navController.navigate(Screen.BranchSelection.route) {
                        popUpTo(Screen.InitialSync.route) { inclusive = true }
                    }
                }
            )
        }

        // Branch Selection Screen
        composable(Screen.BranchSelection.route) {
            BranchSelectionScreen(
                onContinueToOpenShift = { branchName ->
                    navController.navigate(Screen.OpenShift.createRoute(branchName)) {
                        popUpTo(Screen.BranchSelection.route) { inclusive = true }
                    }
                },
                onContinueToExistingShift = { branchName ->
                    // If shift exists, go directly to Dashboard
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.BranchSelection.route) { inclusive = true }
                    }
                },
                onCloseShift = {
                    navController.navigate(Screen.CloseShift.route)
                },
                onBack = {
                    navController.navigate(Screen.InitialSync.route) {
                        popUpTo(Screen.BranchSelection.route) { inclusive = true }
                    }
                }
            )
        }

        // Open Shift Screen
        composable(
            route = Screen.OpenShift.route,
            arguments = listOf(
                navArgument("branchName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val branchName = backStackEntry.arguments?.getString("branchName") ?: ""
            OpenShiftScreen(
                branchName = branchName,
                onShiftOpened = {
                    // Go directly to Dashboard (sync was already done at branch selection)
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.OpenShift.route) { inclusive = true }
                    }
                },
                onBack = {
                    navController.navigate(Screen.BranchSelection.route) {
                        popUpTo(Screen.OpenShift.route) { inclusive = true }
                    }
                }
            )
        }

        // Sync Data Screen
        composable(
            route = Screen.SyncData.route,
            arguments = listOf(
                navArgument("branchName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val branchName = backStackEntry.arguments?.getString("branchName") ?: ""
            SyncDataScreen(
                branchName = branchName,
                onSyncComplete = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.SyncData.route) { inclusive = true }
                    }
                },
                onBack = {
                    navController.popBackStack()
                }
            )
        }

        // Dashboard (Main Order Screen)
        composable(Screen.Dashboard.route) {
            DashboardScreen(
                onNavigateToSale = {
                    navController.navigate(Screen.Sale.createRoute())
                },
                onNavigateToSaleWithOrder = { orderId ->
                    navController.navigate(Screen.Sale.createRoute(orderId = orderId))
                },
                onNavigateToSaleForPayment = { orderId ->
                    navController.navigate(Screen.Sale.createRoute(orderId = orderId, showPayment = true))
                },
                onNavigateToFoodOrders = {
                    navController.navigate(Screen.FoodOrder.route)
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onNavigateToShift = {
                    navController.navigate(Screen.CloseShift.route)
                },
                onNavigateToOrderHistory = {
                    navController.navigate(Screen.OrderHistory.route)
                },
                onNavigateToTables = {
                    navController.navigate(Screen.Table.route)
                },
                onSwitchStaff = {
                    // Navigate to PIN screen for staff switch (keeps device logged in)
                    navController.navigate(Screen.Pin.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                    }
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                    }
                }
            )
        }

        // Close Shift Screen
        composable(Screen.CloseShift.route) {
            CloseShiftScreen(
                onShiftClosed = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                    }
                },
                onBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToMenu = { orderId ->
                    navController.navigate(Screen.Menu.createRoute(orderId))
                },
                onNavigateToOrder = { orderId ->
                    navController.navigate(Screen.Order.createRoute(orderId))
                },
                onNavigateToShift = {
                    navController.navigate(Screen.Shift.route)
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onNavigateToSale = {
                    navController.navigate(Screen.Sale.route)
                },
                onNavigateToFoodOrder = {
                    navController.navigate(Screen.FoodOrder.route)
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.Sale.route,
            arguments = listOf(
                navArgument("orderId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("tableId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("showPayment") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId")
            val tableId = backStackEntry.arguments?.getString("tableId")
            val showPayment = backStackEntry.arguments?.getString("showPayment") == "true"
            SaleScreen(
                onNavigateBack = { navController.popBackStack() },
                orderId = orderId,
                tableId = tableId,
                showPaymentOnStart = showPayment
            )
        }

        composable(Screen.FoodOrder.route) {
            FoodOrderScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.Menu.route,
            arguments = listOf(
                navArgument("orderId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId")
            MenuScreen(
                orderId = orderId,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToOrder = { id ->
                    navController.navigate(Screen.Order.createRoute(id)) {
                        popUpTo(Screen.Dashboard.route)
                    }
                }
            )
        }

        composable(
            route = Screen.Order.route,
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: return@composable
            OrderScreen(
                orderId = orderId,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToMenu = {
                    navController.navigate(Screen.Menu.createRoute(orderId))
                },
                onNavigateToPayment = {
                    navController.navigate(Screen.Payment.createRoute(orderId))
                }
            )
        }

        composable(
            route = Screen.Payment.route,
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: return@composable
            PaymentScreen(
                orderId = orderId,
                onNavigateBack = { navController.popBackStack() },
                onPaymentComplete = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Shift.route) {
            ShiftScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToDebug = { navController.navigate(Screen.DatabaseDebug.route) },
                onNavigateToKitchenPrinter = { navController.navigate(Screen.KitchenPrinter.route) },
                onNavigateToBillPrinter = { navController.navigate(Screen.BillPrinter.route) },
                onNavigateToLabelPrinter = { navController.navigate(Screen.LabelPrinter.route) },
                onNavigateToFoodPartner = { navController.navigate(Screen.FoodPartner.route) }
            )
        }

        composable(Screen.KitchenPrinter.route) {
            KitchenPrinterScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.BillPrinter.route) {
            BillPrinterConfigScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.LabelPrinter.route) {
            LabelPrinterConfigScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.FoodPartner.route) {
            FoodPartnerConnectionScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToAddAccount = { navController.navigate(Screen.AddFoodPlatformAccount.createRoute()) },
                onNavigateToRelogin = { accountId, platform ->
                    navController.navigate(Screen.AddFoodPlatformAccount.createRoute(accountId, platform))
                }
            )
        }

        composable(
            route = Screen.AddFoodPlatformAccount.route,
            arguments = listOf(
                navArgument("accountId") { nullable = true; defaultValue = null },
                navArgument("platform") { nullable = true; defaultValue = null }
            )
        ) { backStackEntry ->
            val accountId = backStackEntry.arguments?.getString("accountId")
            val platform = backStackEntry.arguments?.getString("platform")
            AddFoodPlatformAccountScreen(
                onNavigateBack = { navController.popBackStack() },
                onSuccess = {
                    // Navigate back to FoodPartner and refresh
                    navController.popBackStack()
                },
                existingAccountId = accountId,
                existingPlatform = platform
            )
        }

        composable(Screen.DatabaseDebug.route) {
            DatabaseDebugScreen(
                onBack = { navController.popBackStack() }
            )
        }

        // Order History Screen
        composable(Screen.OrderHistory.route) {
            OrderHistoryScreen(
                onBack = { navController.popBackStack() }
            )
        }

        // Table List Screen
        composable(Screen.Table.route) {
            TableScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToSale = {
                    navController.navigate(Screen.Sale.createRoute())
                },
                onNavigateToSaleWithTable = { tableId ->
                    navController.navigate(Screen.Sale.createRoute(tableId = tableId))
                },
                onNavigateToSaleWithOrder = { orderId ->
                    navController.navigate(Screen.Sale.createRoute(orderId = orderId))
                }
            )
        }
    }
}
