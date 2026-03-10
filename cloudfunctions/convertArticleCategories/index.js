/**
 * 批量转换文章分类云函数
 * 将数字分类（1-10）转换为对应的中文分类名称
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { dryRun = true } = event // 默认为试运行模式

    console.log('========== 开始转换文章分类 ==========')
    console.log('模式：', dryRun ? '试运行（不修改数据）' : '正式转换')

    // 数字到中文分类的映射关系
    const categoryMap = {
      '1': '刷单返利',
      '2': '虚假投资理财',
      '3': '虚假购物服务',
      '4': '冒充电商客服',
      '5': '虚假贷款',
      '6': '虚假征信',
      '7': '冒充领导熟人',
      '8': '冒充公检法',
      '9': '网络婚恋交友',
      '10': '网游虚假交易'
    }

    console.log('分类映射表：', categoryMap)

    const conversionLog = []
    let totalConverted = 0
    let errorCount = 0

    // 遍历每个数字分类
    for (const [numCategory, chineseCategory] of Object.entries(categoryMap)) {
      console.log(`\n处理分类 "${numCategory}" -> "${chineseCategory}"`)

      // 查询该数字分类的所有文章
      const { data: articles } = await db.collection('articles')
        .where({
          category: numCategory
        })
        .get()

      console.log(`找到 ${articles.length} 篇文章`)

      if (articles.length === 0) {
        console.log('跳过（没有文章）')
        continue
      }

      // 显示文章标题
      articles.forEach((article, index) => {
        console.log(`  ${index + 1}. ${article.title}`)
      })

      if (!dryRun) {
        // 正式转换模式：批量更新
        for (const article of articles) {
          try {
            await db.collection('articles').doc(article._id).update({
              data: {
                category: chineseCategory
              }
            })
            
            conversionLog.push({
              id: article._id,
              title: article.title,
              from: numCategory,
              to: chineseCategory,
              status: 'success'
            })
            
            totalConverted++
            console.log(`  ✅ 转换成功：${article.title}`)
          } catch (err) {
            console.error(`  ❌ 转换失败：${article.title}`, err.message)
            conversionLog.push({
              id: article._id,
              title: article.title,
              from: numCategory,
              to: chineseCategory,
              status: 'error',
              error: err.message
            })
            errorCount++
          }
        }
      } else {
        // 试运行模式：只记录
        articles.forEach(article => {
          conversionLog.push({
            id: article._id,
            title: article.title,
            from: numCategory,
            to: chineseCategory,
            status: 'will_convert'
          })
          totalConverted++
        })
      }
    }

    console.log('\n========== 转换完成 ==========')
    console.log(`需要转换的文章数：${totalConverted}`)
    console.log(`转换失败的文章数：${errorCount}`)
    console.log('=====================================')

    return {
      success: true,
      mode: dryRun ? 'dry_run' : 'actual_conversion',
      data: {
        categoryMap: categoryMap,
        totalConverted: totalConverted,
        errorCount: errorCount,
        conversionLog: conversionLog,
        message: dryRun 
          ? `试运行完成，将转换 ${totalConverted} 篇文章。如需正式转换，请传入 { "dryRun": false }`
          : `正式转换完成，成功转换 ${totalConverted} 篇文章，失败 ${errorCount} 篇`
      }
    }

  } catch (err) {
    console.error('转换失败：', err)
    return {
      success: false,
      error: err.message,
      stack: err.stack
    }
  }
}
