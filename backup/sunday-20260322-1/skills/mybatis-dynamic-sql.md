# MyBatis 动态 SQL 完全指南

_最后更新：2026-03-10_  
_掌握程度：⭐⭐⭐⭐⭐_

---

## 📋 目录

1. [核心原则](#核心原则)
2. [动态 SQL 标签](#动态 sql 标签)
3. [表名动态化](#表名动态化)
4. [安全最佳实践](#安全最佳实践)
5. [实战示例](#实战示例)

---

## 🔑 核心原则

### `${}` vs `#{}` 的本质区别

| 特性 | `#{}` | `${}` |
|:---|:---|:---|
| **处理方式** | 预编译 (PreparedStatement) | 直接字符串替换 |
| **SQL 注入** | ✅ 防止 | ❌ 不防止 |
| **使用场景** | 字段值、参数值 | 表名、列名、ORDER BY |
| **性能** | 更高 (可复用执行计划) | 较低 |
| **推荐度** | ⭐⭐⭐⭐⭐ 优先使用 | ⭐⭐ 谨慎使用 |

**铁律**:
- **字段值** → 必须用 `#{}`
- **表名/列名** → 必须用 `${}` (但需自行防注入)

---

## 🏷️ 动态 SQL 标签

### 1. `<if>` - 条件判断

```xml
<select id="findUser" resultType="User">
  SELECT * FROM users
  WHERE 1=1
  <if test="name != null">
    AND name = #{name}
  </if>
  <if test="age != null">
    AND age = #{age}
  </if>
  <if test="status != null">
    AND status = #{status}
  </if>
</select>
```

**要点**:
- `WHERE 1=1` 技巧避免第一个条件前的 `AND` 语法错误
- 或使用 `<where>` 标签自动处理

---

### 2. `<where>` - 智能 WHERE 子句

```xml
<select id="findUser" resultType="User">
  SELECT * FROM users
  <where>
    <if test="name != null">
      AND name = #{name}
    </if>
    <if test="age != null">
      AND age = #{age}
    </if>
  </where>
</select>
```

**自动处理**:
- 移除开头的 `AND` 或 `OR`
- 如果所有条件都不满足，不生成 `WHERE` 子句

---

### 3. `<choose>` / `<when>` / `<otherwise>` - 多分支选择

```xml
<select id="findUser" resultType="User">
  SELECT * FROM users
  <where>
    <choose>
      <when test="id != null">
        AND id = #{id}
      </when>
      <when test="name != null">
        AND name = #{name}
      </when>
      <otherwise>
        AND status = 'ACTIVE'
      </otherwise>
    </choose>
  </where>
</select>
```

**适用场景**:
- 多条件互斥（只用一个）
- 类似 Java 的 `switch-case`

---

### 4. `<set>` - 动态 UPDATE

```xml
<update id="updateUser">
  UPDATE users
  <set>
    <if test="name != null">
      name = #{name},
    </if>
    <if test="age != null">
      age = #{age},
    </if>
    <if test="email != null">
      email = #{email},
    </if>
  </set>
  WHERE id = #{id}
</update>
```

**自动处理**:
- 移除末尾的逗号
- 只生成有值的字段

---

### 5. `<foreach>` - 循环遍历

#### IN 查询

```xml
<select id="findUsersByIds" resultType="User">
  SELECT * FROM users
  WHERE id IN
  <foreach item="id" collection="ids" open="(" separator="," close=")">
    #{id}
  </foreach>
</select>
```

**参数**:
- `collection`: 集合参数名 (list/array/map key)
- `item`: 每个元素的变量名
- `open`: 开头符号
- `close`: 结尾符号
- `separator`: 分隔符

#### 批量 INSERT

```xml
<insert id="batchInsert">
  INSERT INTO users (name, age, email)
  VALUES
  <foreach item="user" collection="users" separator=",">
    (#{user.name}, #{user.age}, #{user.email})
  </foreach>
</insert>
```

---

### 6. `<trim>` - 自定义修剪

```xml
<trim prefix="WHERE" prefixOverrides="AND |OR " suffixOverrides=",">
  <if test="name != null">AND name = #{name}</if>
  <if test="age != null">AND age = #{age}</if>
</trim>
```

**高级用法**:
- `prefix`: 前缀
- `prefixOverrides`: 要移除的前缀
- `suffix`: 后缀
- `suffixOverrides`: 要移除的后缀

---

## 📊 表名动态化

### 场景：分表/分库

```xml
<select id="findOrder" resultType="Order">
  SELECT * FROM orders_${tableSuffix}
  WHERE id = #{id}
</select>
```

### 安全方案对比

#### ❌ 危险做法（直接传入）

```java
// 用户可注入：tableSuffix = "users; DROP TABLE users; --"
mapper.findOrder("202401", id);
```

#### ⚠️ 方案一：白名单校验（推荐）

```java
public List<Order> findOrder(String tableSuffix, Long id) {
    // 白名单校验
    if (!tableSuffix.matches("^\\d{6}$")) {
        throw new IllegalArgumentException("Invalid table suffix");
    }
    return mapper.findOrder(tableSuffix, id);
}
```

#### ✅ 方案二：`<choose>` 硬编码（最安全）

```xml
<select id="findOrder" resultType="Order">
  SELECT * FROM
  <choose>
    <when test="tableSuffix == '202401'">orders_202401</when>
    <when test="tableSuffix == '202402'">orders_202402</when>
    <when test="tableSuffix == '202403'">orders_202403</when>
    <otherwise>orders_default</otherwise>
  </choose>
  WHERE id = #{id}
</select>
```

#### 🔧 方案三：Java 枚举

```java
public enum OrderTable {
    ORDERS_202401("orders_202401"),
    ORDERS_202402("orders_202402"),
    ORDERS_202403("orders_202403");
    
    private final String tableName;
    
    OrderTable(String tableName) {
        this.tableName = tableName;
    }
    
    public String getTableName() {
        return tableName;
    }
}

// 使用
mapper.findOrder(OrderTable.ORDERS_202401.getTableName(), id);
```

---

## 🛡️ 安全最佳实践

### 1. 字段值 → 始终用 `#{}`

```xml
<!-- ✅ 正确 -->
WHERE name = #{name}

<!-- ❌ 错误 -->
WHERE name = '${name}'
```

### 2. 表名/列名 → 必须校验

```java
// 正则校验
if (!tableName.matches("^[a-zA-Z0-9_]+$")) {
    throw new SecurityException("Invalid table name");
}

// 白名单校验
List<String> allowedTables = Arrays.asList("users", "orders", "products");
if (!allowedTables.contains(tableName)) {
    throw new SecurityException("Table not allowed");
}
```

### 3. ORDER BY → 特殊处理

```xml
<!-- ❌ 危险 -->
ORDER BY ${columnName}

<!-- ✅ 安全：白名单 -->
<choose>
  <when test="orderBy == 'name'">ORDER BY name</when>
  <when test="orderBy == 'age'">ORDER BY age</when>
  <when test="orderBy == 'created_at'">ORDER BY created_at</when>
  <otherwise>ORDER BY id</otherwise>
</choose>
```

### 4. 批量操作 → 限制数量

```java
// 限制批量大小
if (ids.size() > 1000) {
    throw new IllegalArgumentException("Batch size too large");
}
```

---

## 💼 实战示例

### 完整示例：动态查询 + 分页

```xml
<mapper namespace="com.example.UserMapper">
  
  <!-- 动态查询 -->
  <select id="findUsers" resultType="User">
    SELECT id, name, age, email, created_at
    FROM users
    <where>
      <if test="name != null and name != ''">
        AND name LIKE CONCAT('%', #{name}, '%')
      </if>
      <if test="minAge != null">
        AND age >= #{minAge}
      </if>
      <if test="maxAge != null">
        AND age <= #{maxAge}
      </if>
      <if test="status != null">
        AND status = #{status}
      </if>
      <if test="ids != null and ids.size() > 0">
        AND id IN
        <foreach item="id" collection="ids" open="(" separator="," close=")">
          #{id}
        </foreach>
      </if>
    </where>
    ORDER BY
    <choose>
      <when test="orderBy == 'name'">name</when>
      <when test="orderBy == 'age'">age</when>
      <otherwise>created_at</otherwise>
    </choose>
    DESC
    LIMIT #{offset}, #{limit}
  </select>
  
  <!-- 动态更新 -->
  <update id="updateUser">
    UPDATE users
    <set>
      <if test="name != null">name = #{name},</if>
      <if test="age != null">age = #{age},</if>
      <if test="email != null">email = #{email},</if>
      <if test="status != null">status = #{status},</if>
    </set>
    WHERE id = #{id}
  </update>
  
  <!-- 批量插入 -->
  <insert id="batchInsert">
    INSERT INTO users (name, age, email)
    VALUES
    <foreach item="user" collection="users" separator=",">
      (#{user.name}, #{user.age}, #{user.email})
    </foreach>
  </insert>
  
  <!-- 分表查询 -->
  <select id="findOrderById" resultType="Order">
    SELECT * FROM orders_${tableSuffix}
    WHERE id = #{id}
  </select>
  
</mapper>
```

### Java 调用示例

```java
@Service
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    // 动态查询
    public List<User> findUsers(UserQuery query) {
        // 安全校验
        if (query.getIds() != null && query.getIds().size() > 1000) {
            throw new IllegalArgumentException("Too many IDs");
        }
        
        // ORDER BY 白名单
        List<String> allowedOrderBy = Arrays.asList("name", "age", "created_at");
        if (!allowedOrderBy.contains(query.getOrderBy())) {
            query.setOrderBy("created_at"); // 默认值
        }
        
        return userMapper.findUsers(query);
    }
    
    // 分表查询
    public Order findOrder(String month, Long id) {
        // 表名校验：YYYYMM 格式
        if (!month.matches("^\\d{6}$")) {
            throw new IllegalArgumentException("Invalid month format");
        }
        
        return userMapper.findOrderById(month, id);
    }
}
```

---

## 📝 速查表

| 标签 | 用途 | 关键属性 |
|:---|:---|:---|
| `<if>` | 条件判断 | `test` |
| `<where>` | 智能 WHERE | 自动去除 AND/OR |
| `<set>` | 动态 UPDATE | 自动去除末尾逗号 |
| `<choose>` | 多分支选择 | 类似 switch-case |
| `<when>` | 分支条件 | `test` |
| `<otherwise>` | 默认分支 | 无 |
| `<foreach>` | 循环遍历 | `collection`, `item`, `open`, `close`, `separator` |
| `<trim>` | 自定义修剪 | `prefix`, `prefixOverrides`, `suffix`, `suffixOverrides` |

---

## 🎯 核心要点总结

1. **`#{}` 防注入，`${}` 不防** - 字段值永远用 `#{}`
2. **表名/列名必须校验** - 白名单 > `<choose>` > 正则
3. **`<where>` 替代 `WHERE 1=1`** - 更优雅
4. **`<set>` 自动去逗号** - UPDATE 必备
5. **`<foreach>` 注意性能** - 批量操作限制数量
6. **ORDER BY 特殊处理** - 必须白名单

---

_技能来源：2026-03-09 深度学习整理_  
_适用场景：MyBatis XML 动态查询、分表分库、动态条件过滤_
