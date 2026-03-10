/**
 * 修复 category = "全部" 的文章
 * 根据标题关键词重新分类
 */

const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
    try {
        console.log('开始修复 category = "全部" 的文章...')

        // 获取所有 category = "全部" 的文章
        const { data: articles } = await db.collection('articles')
            .where({
                category: '全部'
            })
            .get()

        console.log(`找到 ${articles.length} 篇需要修复的文章`)

        if (articles.length === 0) {
            return {
                success: true,
                message: '没有需要修复的文章'
            }
        }

        // 批量重新分类
        const updateTasks = articles.map(article => {
            let category = '全部' // 默认值
            const title = article.title || ''
            const content = article.content || ''
            const text = title + ' ' + content

            // 根据标题和内容关键词判断分类

            // 刷单返利类
            if (text.includes('刷单') ||
                text.includes('兼职') ||
                text.includes('返利') ||
                text.includes('客服兼职')) {
                category = '刷单返利'
            }
            // 虚假投资理财类
            else if (text.includes('投资') ||
                text.includes('理财') ||
                text.includes('高收益') ||
                text.includes('交友投资')) {
                category = '虚假投资理财'
            }
            // 虚假购物服务类
            else if (text.includes('购物') ||
                text.includes('商品') ||
                text.includes('网购') && text.includes('商品')) {
                category = '虚假购物服务'
            }
            // 冒充电商客服类
            else if (text.includes('退款') ||
                text.includes('客服') && !text.includes('兼职') ||
                text.includes('网购') && text.includes('退款')) {
                category = '冒充电商客服'
            }
            // 虚假贷款类
            else if (text.includes('贷款') ||
                text.includes('校园贷') ||
                text.includes('培训贷') ||
                text.includes('借贷')) {
                category = '虚假贷款'
            }
            // 虚假征信类
            else if (text.includes('征信') ||
                text.includes('信用') && text.includes('记录')) {
                category = '虚假征信'
            }
            // 冒充领导熟人类
            else if (text.includes('领导') ||
                text.includes('熟人') ||
                text.includes('孙子') ||
                text.includes('女婿') ||
                text.includes('晚辈')) {
                category = '冒充领导熟人'
            }
            // 冒充公检法类
            else if (text.includes('公检法') ||
                text.includes('警察') ||
                text.includes('法院') ||
                text.includes('检察院') ||
                text.includes('警方')) {
                category = '冒充公检法'
            }
            // 网络婚恋交友类
            else if (text.includes('婚恋') ||
                text.includes('交友') ||
                text.includes('恋爱') ||
                text.includes('杀猪盘') ||
                text.includes('相亲')) {
                category = '网络婚恋交友'
            }
            // 网游虚假交易类
            else if (text.includes('游戏') ||
                text.includes('网游') ||
                text.includes('装备') ||
                text.includes('账号交易')) {
                category = '网游虚假交易'
            }

            console.log(`修复: "${article.title}" -> ${category}`)

            // 如果分类仍然是"全部"，说明无法自动分类，保持不变
            if (category === '全部') {
                console.warn(`⚠️ 无法自动分类: ${article.title}`)
                return Promise.resolve()
            }

            return db.collection('articles').doc(article._id).update({
                data: {
                    category: category
                }
            })
        })

        // 执行所有更新任务
        const results = await Promise.all(updateTasks)
        const successCount = results.filter(r => r !== undefined).length

        console.log('修复完成')

        return {
            success: true,
            message: `成功修复 ${successCount} 篇文章的分类`,
            total: articles.length,
            fixed: successCount
        }

    } catch (err) {
        console.error('修复失败：', err)
        return {
            success: false,
            error: err.message,
            stack: err.stack
        }
    }
}
