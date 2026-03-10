/**
 * 检查文章分类云函数
 * 用于诊断分类问题，查看每个分类的文章数量
 */

const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
    try {
        console.log('开始检查文章分类...')

        // 获取所有文章
        const { data: articles } = await db.collection('articles').get()

        console.log(`总共找到 ${articles.length} 篇文章`)

        if (articles.length === 0) {
            return {
                success: true,
                message: '数据库中没有文章',
                data: {}
            }
        }

        // 统计每个分类的文章数量
        const categoryStats = {}
        const categoriesWithoutField = []
        const uniqueCategories = new Set()

        articles.forEach((article, index) => {
            const category = article.category

            // 记录所有出现过的分类值
            if (category) {
                uniqueCategories.add(category)
            }

            // 统计
            if (!category || category === '') {
                categoriesWithoutField.push({
                    id: article._id,
                    title: article.title,
                    category: category || '(空)'
                })
            } else {
                if (!categoryStats[category]) {
                    categoryStats[category] = {
                        count: 0,
                        articles: []
                    }
                }
                categoryStats[category].count++
                categoryStats[category].articles.push({
                    id: article._id,
                    title: article.title
                })
            }
        })

        // 前端期望的分类列表
        const expectedCategories = [
            '全部',
            '刷单返利',
            '虚假投资理财',
            '虚假购物服务',
            '冒充电商客服',
            '虚假贷款',
            '虚假征信',
            '冒充领导熟人',
            '冒充公检法',
            '网络婚恋交友',
            '网游虚假交易'
        ]

        // 检查每个期望的分类
        const missingCategories = []
        expectedCategories.forEach(cat => {
            if (cat !== '全部' && !categoryStats[cat]) {
                missingCategories.push(cat)
            }
        })

        // 检查是否有意外的分类值
        const unexpectedCategories = []
        uniqueCategories.forEach(cat => {
            if (!expectedCategories.includes(cat)) {
                unexpectedCategories.push(cat)
            }
        })

        console.log('分类统计：', categoryStats)
        console.log('缺少文章的分类：', missingCategories)
        console.log('意外的分类值：', unexpectedCategories)
        console.log('没有 category 字段的文章：', categoriesWithoutField.length)

        return {
            success: true,
            data: {
                totalArticles: articles.length,
                categoryStats: categoryStats,
                missingCategories: missingCategories,
                unexpectedCategories: unexpectedCategories,
                articlesWithoutCategory: categoriesWithoutField,
                allUniqueCategories: Array.from(uniqueCategories),
                expectedCategories: expectedCategories
            }
        }

    } catch (err) {
        console.error('检查失败：', err)
        return {
            success: false,
            error: err.message,
            stack: err.stack
        }
    }
}
