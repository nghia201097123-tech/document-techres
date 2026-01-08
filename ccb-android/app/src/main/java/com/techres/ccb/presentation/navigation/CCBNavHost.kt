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
import com.techres.ccb.presentation.screens.home.HomeScreen
import com.techres.ccb.presentation.screens.menu.MenuScreen
import com.techres.ccb.presentation.screens.order.OrderScreen
import com.techres.ccb.presentation.screens.payment.PaymentScreen
import com.techres.ccb.presentation.screens.settings.SettingsScreen
import com.techres.ccb.presentation.screens.shift.ShiftScreen
import com.techres.ccb.presentation.screens.splash.SplashScreen

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Pin : Screen("pin")
    object Home : Screen("home")
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
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    // Skip PIN screen, go directly to Home
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Pin.route) {
            PinScreen(
                onPinVerified = {
                    navController.navigate(Screen.Home.route) {
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
                onLogout = {
                    navController.navigate(Screen.Pin.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
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
                        popUpTo(Screen.Home.route)
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
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
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
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
