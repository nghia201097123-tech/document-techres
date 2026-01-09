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
import com.techres.ccb.presentation.screens.shift.ShiftScreen
import com.techres.ccb.presentation.screens.splash.SplashScreen
import com.techres.ccb.presentation.screens.sync.SyncDataScreen
import com.techres.ccb.presentation.screens.initialsync.InitialSyncScreen
import com.techres.ccb.presentation.screens.debug.DatabaseDebugScreen

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
    object Sale : Screen("sale")  // New POS Sale Screen
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
    object DatabaseDebug : Screen("database_debug")
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
                    navController.navigate(Screen.Sale.route)
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

        composable(Screen.Sale.route) {
            SaleScreen(
                onNavigateBack = { navController.popBackStack() }
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
                onNavigateToDebug = { navController.navigate(Screen.DatabaseDebug.route) }
            )
        }

        composable(Screen.DatabaseDebug.route) {
            DatabaseDebugScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}
