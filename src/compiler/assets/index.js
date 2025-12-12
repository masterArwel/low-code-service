;(function () {
  var API_HOSTS = {
    fat: 'xxx.com/api',
    pro: 'xxx.com/api',
  }
  function detectEnv() {
    try {
      var seg = (location.pathname || '').split('/').filter(Boolean)
      if (seg[0] !== 'ls') return 'fat'
      var maybeEnv = seg[2] || ''
      if (maybeEnv === 'fat' || maybeEnv === 'uat' || maybeEnv === 'pre') {
        return maybeEnv
      }
      return 'pro'
    } catch (e) {
      return 'fat'
    }
  }
  function getAPIUrl() {
    var env = detectEnv()
    return API_HOSTS[env] || API_HOSTS.fat
  }
  var APP_CONTAINER_ID = 'app'
  var LOADER_ID = 'hb-page-check-loader'
  function createLoader() {
    var loader = document.createElement('div')
    loader.id = LOADER_ID
    loader.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#fff;color:#666;font-size:14px;z-index:9999;'
    loader.innerHTML = '<div style="text-align:center;"><div style="width:36px;height:36px;border-radius:50%;border:3px solid #e5e5e5;border-top-color:#409eff;animation:hbspin 1s linear infinite;margin:0 auto 12px;"></div><div>页面校验中...</div></div>'
    var keyframes = document.createElement('style')
    keyframes.innerHTML = '@keyframes hbspin{to{transform:rotate(360deg)}}'
    document.head.appendChild(keyframes)
    document.body.appendChild(loader)
  }
  function removeLoader() {
    var loader = document.getElementById(LOADER_ID)
    if (loader && loader.parentNode) loader.parentNode.removeChild(loader)
  }
  function parseGuidAndPreview() {
    // 预览的链接：https://m.hellobike.com/ls/7349630240455655442/fat/latest/index.html
    // 发布的链接：https://m.hellobike.com/ls/publish_7349630240455655442/fat/latest/index.html
    try {
      var seg = (location.pathname || '').split('/').filter(Boolean)
      // path: /ls/{id}/{env}/latest/index.html
      var idSeg = seg[1] || ''
      var preview = true
      var guid = idSeg || ''
      if (idSeg.indexOf('publish_') === 0) {
        preview = false
        guid = idSeg.replace(/^publish_/, '')
      }
      return { guid: guid, preview: preview }
    } catch (e) {
      return { guid: '', preview: true }
    }
  }
  // 验证失败时，显示错误页面
  function showInvalidPage(invalidMsg) {
    var msg = invalidMsg || '当前页面已失效'
    var html = ''
      + '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f8fa;padding:24px;">'
      + '  <div style="max-width:520px;width:100%;background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.06);padding:32px 24px;text-align:center;">'
      + '    <div style="margin-bottom:16px;">'
      + '      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '        <circle cx="28" cy="28" r="28" fill="#FEECEC"/>'
      + '        <circle cx="28" cy="28" r="18" fill="#FFFFFF"/>'
      + '        <circle cx="28" cy="28" r="12" fill="#F56C6C"/>'
      + '        <rect x="26.75" y="18.5" width="2.5" height="11" rx="1.25" fill="#FFFFFF"/>'
      + '        <circle cx="28" cy="32.5" r="1.75" fill="#FFFFFF"/>'
      + '      </svg>'
      + '    </div>'
      + '    <div style="font-size:16px;color:#303133;line-height:1.6;margin-bottom:8px;">' + msg + '</div>'
      + '    <div style="font-size:13px;color:#909399;line-height:1.5;">如有疑问，请联系页面发布方或稍后重试</div>'
      + '  </div>'
      + '</div>';
    var body = document.body
    var app = document.getElementById(APP_CONTAINER_ID)
    if (app) app.innerHTML = ''
    body.innerHTML = html
  }

  // 动态引入 main.js，确保 Vite 正确分析依赖关系而打包
  function loadMainModule() {
    import('./main.js')
  }
  function validateAndBoot() {
    var apiUrl = getAPIUrl()
    createLoader()
    var info = parseGuidAndPreview()
    if (!info.guid) {
      removeLoader()
      showInvalidPage('当前页面已失效')
      return
    }
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        guid: info.guid,
        preview: info.preview,
        action: 'landing.page.valid'
      })
    })
      .then(function (res) { return res.json() })
      .then(function (dto) {
        var ok = dto && dto.data && dto.data.isValid
        removeLoader()
        if (ok) {
          loadMainModule()
        } else {
          var msg = (dto && dto.data && dto.data.invalidMsg) || '当前页面已失效'
          showInvalidPage(msg)
        }
      })
      .catch(function () {
        removeLoader()
        showInvalidPage('校验失败，请稍后重试')
      })
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', validateAndBoot)
  } else {
    validateAndBoot()
  }
})()
