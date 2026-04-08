# Vue3 前端开发学习任务 - 记账本可视化项目

**适用人群**: Java 后端开发人员  
**目标**: 2 周内完成记账本前端页面开发  
**技术栈**: Vue3 + Element Plus + ECharts + Axios

---

## 📅 学习路线总览

| 阶段 | 内容 | 时间 | 产出 |
|:---|:---|:---:|:---|
| 阶段一 | HTML/CSS/JS 基础 | 2 天 | 静态页面 |
| 阶段二 | Vue3 核心 | 3 天 | 组件化开发 |
| 阶段三 | Element Plus UI | 2 天 | 完整页面 |
| 阶段四 | ECharts 图表 | 2 天 | 数据可视化 |
| 阶段五 | API 对接 | 2 天 | 前后端联调 |
| 阶段六 | Electron 打包 | 1 天 | 桌面应用 |

---

## 📚 阶段一：HTML/CSS/JS 基础 (2 天)

### Day 1-1: HTML5 + CSS3 基础

**学习内容**:
- [ ] HTML 常用标签 (div, span, form, input, table)
- [ ] CSS 选择器、盒模型、Flex 布局
- [ ] 响应式设计基础 (media query)

**实践任务**:
```html
<!-- 创建一个简单的记账表单 -->
<form class="transaction-form">
  <div class="form-item">
    <label>金额</label>
    <input type="number" placeholder="请输入金额">
  </div>
  <div class="form-item">
    <label>类型</label>
    <select>
      <option>收入</option>
      <option>支出</option>
    </select>
  </div>
  <button type="submit">提交</button>
</form>
```

**学习资源**:
- MDN Web Docs: https://developer.mozilla.org/zh-CN/
- B 站教程：搜索"HTML CSS 零基础"

---

### Day 1-2: JavaScript ES6+ 核心

**学习内容**:
- [ ] 变量声明 (let/const)
- [ ] 箭头函数
- [ ] 解构赋值
- [ ] Promise/async-await
- [ ] 模块导入导出 (import/export)
- [ ] 数组方法 (map/filter/reduce)

**实践任务**:
```javascript
// 模拟 API 请求
async function fetchTransactions() {
  const response = await fetch('/api/transactions')
  const data = await response.json()
  return data
}

// 数据处理
const total = transactions
  .filter(t => t.type === 'expense')
  .reduce((sum, t) => sum + t.amount, 0)
```

**学习资源**:
- 现代 JavaScript 教程：https://zh.javascript.info/
- B 站：ES6 入门教程

---

## 📚 阶段二：Vue3 核心 (3 天)

### Day 2-1: Vue3 基础

**学习内容**:
- [ ] Vue3 创建项目 (Vite)
- [ ] 模板语法 ({{ }}, v-bind, v-on)
- [ ] 响应式基础 (ref, reactive)
- [ ] 计算属性 (computed)
- [ ] 监听器 (watch)

**实践任务**:
```bash
# 创建项目
npm create vite@latest accounting-app -- --template vue
cd accounting-app
npm install
npm run dev
```

```vue
<!-- 计数器示例 -->
<template>
  <div>
    <p>计数：{{ count }}</p>
    <button @click="increment">+1</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
const increment = () => count.value++
</script>
```

---

### Day 2-2: 组件化开发

**学习内容**:
- [ ] 组件定义与使用
- [ ] Props 传递
- [ ] 事件发射 (emit)
- [ ] 插槽 (slot)
- [ ] 生命周期钩子

**实践任务**:
```vue
<!-- 子组件：TransactionItem.vue -->
<template>
  <div class="transaction-item">
    <span>{{ item.title }}</span>
    <span :class="item.type">{{ item.amount }}</span>
    <button @click="$emit('delete', item.id)">删除</button>
  </div>
</template>

<script setup>
defineProps(['item'])
defineEmits(['delete'])
</script>
```

---

### Day 2-3: 状态管理 + 路由

**学习内容**:
- [ ] Vue Router 基础
- [ ] Pinia 状态管理
- [ ] 路由守卫
- [ ] 全局状态共享

**实践任务**:
```javascript
// stores/user.js - Pinia Store
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    username: ''
  }),
  actions: {
    login(token, username) {
      this.token = token
      this.username = username
      localStorage.setItem('token', token)
    },
    logout() {
      this.token = ''
      this.username = ''
      localStorage.removeItem('token')
    }
  }
})
```

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('@/views/Login.vue') },
  { path: '/dashboard', component: () => import('@/views/Dashboard.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (!token && to.path !== '/login') {
    next('/login')
  } else {
    next()
  }
})
```

---

## 📚 阶段三：Element Plus UI (2 天)

### Day 3-1: 基础组件

**学习内容**:
- [ ] 安装配置 Element Plus
- [ ] 布局组件 (Container, Row, Col)
- [ ] 表单组件 (Form, Input, Select)
- [ ] 按钮与图标

**实践任务**:
```bash
npm install element-plus @element-plus/icons-vue
```

```vue
<!-- 登录表单 -->
<template>
  <el-card class="login-card">
    <el-form :model="form" label-width="80px">
      <el-form-item label="用户名">
        <el-input v-model="form.username" prefix-icon="User" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleLogin" :loading="loading">
          登录
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { reactive, ref } from 'vue'
const form = reactive({ username: '', password: '' })
const loading = ref(false)
</script>
```

---

### Day 3-2: 数据展示组件

**学习内容**:
- [ ] 表格 (Table)
- [ ] 分页 (Pagination)
- [ ] 对话框 (Dialog)
- [ ] 消息提示 (Message)

**实践任务**:
```vue
<!-- 记账列表 -->
<template>
  <el-table :data="transactions" stripe>
    <el-table-column prop="date" label="日期" />
    <el-table-column prop="title" label="标题" />
    <el-table-column prop="amount" label="金额">
      <template #default="{ row }">
        <span :class="row.type === 'income' ? 'text-green' : 'text-red'">
          {{ row.type === 'income' ? '+' : '-' }}{{ row.amount }}
        </span>
      </template>
    </el-table-column>
    <el-table-column label="操作">
      <template #default="{ row }">
        <el-button size="small" @click="handleEdit(row)">编辑</el-button>
        <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
  
  <el-pagination
    v-model:current-page="page"
    :page-size="10"
    :total="total"
    @current-change="fetchData"
  />
</template>
```

---

## 📚 阶段四：ECharts 图表 (2 天)

### Day 4-1: 基础图表

**学习内容**:
- [ ] ECharts 安装配置
- [ ] 折线图 (趋势)
- [ ] 柱状图 (对比)
- [ ] 饼图 (占比)

**实践任务**:
```bash
npm install echarts vue-echarts
```

```vue
<!-- 月度收支趋势图 -->
<template>
  <v-chart class="chart" :option="option" autoresize />
</template>

<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { Title, Tooltip, Legend, Grid } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, Title, Tooltip, Legend, Grid])

const props = defineProps(['data'])

const option = computed(() => ({
  title: { text: '月度收支趋势' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['收入', '支出'] },
  xAxis: {
    type: 'category',
    data: props.data.map(item => item.month)
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: '收入',
      type: 'line',
      data: props.data.map(item => item.income),
      itemStyle: { color: '#67C23A' }
    },
    {
      name: '支出',
      type: 'line',
      data: props.data.map(item => item.expense),
      itemStyle: { color: '#F56C6C' }
    }
  ]
}))
</script>

<style scoped>
.chart {
  width: 100%;
  height: 400px;
}
</style>
```

---

### Day 4-2: 高级图表

**学习内容**:
- [ ] 环形图 (分类占比)
- [ ] 面积图 (累计)
- [ ] 图表联动
- [ ] 响应式适配

**实践任务**:
```vue
<!-- 分类支出饼图 -->
<template>
  <v-chart class="chart" :option="pieOption" autoresize />
</template>

<script setup>
import { computed } from 'vue'
import { PieChart } from 'echarts/charts'
import { Tooltip, Legend } from 'echarts/components'

const props = defineProps(['categoryData'])

const pieOption = computed(() => ({
  title: { text: '支出分类占比', left: 'center' },
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    data: props.categoryData.map(item => ({
      name: item.category,
      value: item.amount
    })),
    label: { show: true, formatter: '{b}: {c} ({d}%)' }
  }]
}))
</script>
```

---

## 📚 阶段五：API 对接 (2 天)

### Day 5-1: Axios 配置

**学习内容**:
- [ ] Axios 安装配置
- [ ] 请求拦截器 (Token)
- [ ] 响应拦截器 (错误处理)
- [ ] API 模块化

**实践任务**:
```javascript
// api/index.js
import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 5000
})

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期')
      localStorage.removeItem('token')
      window.location.href = '/login'
    } else {
      ElMessage.error(error.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

export default {
  // 认证
  login: (data) => api.post('/auth/login', data),
  
  // 记账
  getTransactions: (params) => api.get('/transactions', { params }),
  addTransaction: (data) => api.post('/transactions', data),
  updateTransaction: (id, data) => api.put(`/transactions/${id}`, data),
  deleteTransaction: (id) => api.delete(`/transactions/${id}`),
  
  // 统计
  getMonthlyStats: () => api.get('/stats/monthly'),
  getCategoryStats: () => api.get('/stats/category')
}
```

---

### Day 5-2: 前后端联调

**学习内容**:
- [ ] 跨域配置 (CORS)
- [ ] 接口文档对接
- [ ] 错误处理
- [ ] 加载状态

**实践任务**:
```java
// Spring Boot CORS 配置
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

```vue
<!-- 完整 CRUD 示例 -->
<template>
  <div>
    <el-button type="primary" @click="showDialog = true">新增记账</el-button>
    
    <el-table :data="list" v-loading="loading">
      <!-- 表格列 -->
    </el-table>
    
    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showDialog" title="记账">
      <el-form :model="form">
        <el-form-item label="金额">
          <el-input v-model="form.amount" type="number" />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio label="income">收入</el-radio>
            <el-radio label="expense">支出</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'

const list = ref([])
const loading = ref(false)
const showDialog = ref(false)
const submitting = ref(false)
const form = reactive({ amount: '', type: 'expense', title: '' })

const fetchData = async () => {
  loading.value = true
  try {
    list.value = await api.getTransactions()
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    await api.addTransaction(form)
    showDialog.value = false
    fetchData()
  } finally {
    submitting.value = false
  }
}

onMounted(fetchData)
</script>
```

---

## 📚 阶段六：Electron 打包 (1 天)

### Day 6-1: 桌面应用打包

**学习内容**:
- [ ] Electron 安装配置
- [ ] 主进程配置
- [ ] 打包命令
- [ ] 安装包生成

**实践任务**:
```bash
# 安装 Electron
npm install electron electron-builder --save-dev

# 配置 package.json (见上文)

# 开发模式
npm run electron:dev

# 打包 Windows
npm run electron:build -- --win

# 打包 Mac
npm run electron:build -- --mac
```

**输出**: `release/记账本 Setup 1.0.0.exe`

---

## 📋 每日学习检查表

### 阶段一 (Day 1-2)
- [ ] HTML 表单页面完成
- [ ] CSS 样式美化
- [ ] JS 基础语法掌握
- [ ] ES6 异步编程理解

### 阶段二 (Day 3-5)
- [ ] Vue3 项目创建
- [ ] 组件化开发完成
- [ ] 路由配置完成
- [ ] Pinia 状态管理使用

### 阶段三 (Day 6-7)
- [ ] Element Plus 集成
- [ ] 登录页面完成
- [ ] 列表页面完成
- [ ] 表单对话框完成

### 阶段四 (Day 8-9)
- [ ] ECharts 集成
- [ ] 折线图完成
- [ ] 饼图完成
- [ ] 图表响应式适配

### 阶段五 (Day 10-11)
- [ ] Axios 配置完成
- [ ] API 接口对接
- [ ] 错误处理完善
- [ ] 前后端联调通过

### 阶段六 (Day 12)
- [ ] Electron 配置完成
- [ ] 打包测试通过
- [ ] 安装包生成

---

## 🎯 最终项目结构

```
accounting-app/
├── src/
│   ├── api/              # API 请求
│   │   └── index.js
│   ├── assets/           # 静态资源
│   ├── components/       # 组件
│   │   ├── TransactionForm.vue
│   │   ├── TransactionTable.vue
│   │   └── Charts/
│   │       ├── MonthlyChart.vue
│   │       └── CategoryChart.vue
│   ├── router/           # 路由
│   │   └── index.js
│   ├── stores/           # 状态管理
│   │   └── user.js
│   ├── views/            # 页面
│   │   ├── Login.vue
│   │   ├── Dashboard.vue
│   │   └── Transactions.vue
│   ├── App.vue
│   └── main.js
├── electron/             # Electron 配置
│   ├── main.js
│   └── preload.js
├── package.json
└── vite.config.js
```

---

## 📖 学习资源汇总

### 官方文档
- Vue3: https://cn.vuejs.org/
- Element Plus: https://element-plus.org/zh-CN/
- ECharts: https://echarts.apache.org/zh/index.html
- Axios: https://axios-http.com/

### 视频教程
- B 站：搜索"Vue3 零基础入门"
- 慕课网：Vue3 实战课程

### 代码示例
- GitHub: 搜索"vue3 admin template"
- Gitee: 搜索"Vue 记账本"

---

## 💡 学习建议

1. **边学边做**: 每个知识点都要动手写代码
2. **先模仿后创新**: 先照着教程写，再自己修改
3. **善用调试**: 浏览器 DevTools 是好朋友
4. **及时提问**: 遇到问题先搜索，再问 AI/社区
5. **每日复盘**: 晚上花 10 分钟回顾当天所学

---

**预计完成时间**: 12-14 天 (每天 2-3 小时)  
**最终成果**: 可运行的记账本桌面应用

_创建时间：2026-04-08_
