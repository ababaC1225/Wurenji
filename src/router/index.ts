import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.path !== '/login' && !auth.isLoggedIn) {
    return '/login'
  }

  if (to.path === '/login' && auth.isLoggedIn && to.query.force !== '1') {
    return '/'
  }

  return true
})

export default router
