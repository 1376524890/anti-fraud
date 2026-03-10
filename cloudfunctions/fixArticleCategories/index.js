/**
 * 修复文章分类云函数
 * 自动修复常见的分类问题：去除空格、统一格式
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { dryRun = true } = event // 默认为试运行模式，不实际修改数据

    console.log('========== 开始修复文章分类 ==========')
    console.log('模式：', dryRun ? '试运行（不修改数据）' : '正式修复')

    // 标准分类列表
    const standardCategories = [
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

    // 获取所有文章
    const { data: articles } = await db.collection('articles').get()
    console.log(`总共找到 ${articles.length} 篇文章`)

    const fixLog = []
    let fixedCount = 0
    let errorCount = 0

    for (const article of articles) {
      const originalCategory = article.category
      
      // 跳过没有 category 字段的文章
      if (!originalCategory) {
        fixLog.push({
          id: article._id,
          title: article.title,
          issue: '缺少 category 字段',
          action: '需要手动添加',
          status: 'skip'
        })
        continue
      }

      // 去除前后空格
      const trimmedCategory = originalCategory.trim()

      // 检查是否需要修复
      if (trimmedCategory !== originalCategory) {
        console.log(`发现需要修复的文章：${article.title}`)
        console.log(`  原始分类："${originalCategory}" (长度: ${originalCategory.length})`)
        console.log(`  修复后："${trimmedCategory}" (长度: ${trimmedCategory.length})`)

        if (!dryRun) {
          try {
            await db.collection('articles').doc(article._id).update({
              data: {
                category: trimmedCategory
              }
            })
            fixLog.push({
              id: article._id,
              title: article.title,
              originalCategory: originalCategory,
              fixedCategory: trimmedCategory,
              status: 'fixed'
            })
            fixedCount++
            console.log(`  ✅ 修复成功`)
          } catch (err) {
            console.error(`  ❌ 修复失败：`, err.message)
            fixLog.push({
              id: article._id,
              title: article.title,
              originalCategory: originalCategory,
              error: err.message,
              status: 'error'
            })
            errorCount++
          }
        } else {
          fixLog.push({
            id: article._id,
            title: article.title,
            originalCategory: originalCategory,
            fixedCategory: trimmedCategory,
            status: 'will_fix'
          })
          fixedCount++
        }
      } else if (!standardCategories.includes(trimmedCategory)) {
        // 分类名称不在标准列表中
        fixLog.push({
          id: article._id,
          title: article.title,
          category: trimmedCategory,
          issue: '分类名称不在标准列表中',
          action: '需要手动检查',
          status: 'warning'
        })
      }
    }

    console.log('========== 修复完成 ==========')
    console.log(`需要修复的文章数：${fixedCount}`)
    console.log(`修复失败的文章数：${errorCount}`)
    console.log('=====================================')

    return {
      success: true,
      mode: dryRun ? 'dry_run' : 'actual_fix',
      data: {
        totalArticles: articles.length,
        fixedCount: fixedCount,
        errorCount: errorCount,
        fixLog: fixLog,
        standardCategories: standardCategories,
        message: dryRun 
          ? '试运行完成，未实际修改数据。如需正式修复，请传入 { "dryRun": false }'
          : '正式修复完成'
      }
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
