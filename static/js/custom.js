// 功能


$(document).ready(function() {

    var chatBtn = $('#chatBtn');
    var chatInput = $('#chatInput');
    var chatWindow = $('#chatWindow');

    var ws = null;
    var wsCache = new WebStorageCache();

    //用户回话ID
    var replyId = localStorage.getItem('replyId');
    if(replyId==null){
      replyId=generateUUID();
      localStorage.setItem("replyId",replyId);
    }

    //模型 1 gpt3, 4 gpt4 2 画图
    var model=localStorage.getItem('model');
    //接口套餐标识
    var identification="";
    defaultSelModel(model);

    //连续对话
    var continuousDialogue = localStorage.getItem('continuousDialogue');
    showDelfualtContinuousDialogue();

    //是否存储回话记录
    var messages= saveHistoryMsg();
    var archiveSession= localStorage.getItem('archiveSession');
    showDelfualtArchiveSession();
    loadHistoryMsg();
    
    //token
    var token=wsCache.get('token');

    var params={};
    var wsApi='ws://api-openai.dtgarden.com';  //ws://api-openai.dtgarden.com  //127.0.0.1:8080
    var api='http://api-openai.dtgarden.com';
    var roloeCode='gpt';   
    var appId=localStorage.getItem('appId');   
    var secret=localStorage.getItem('secret');  
    defaultAccount()

  //判断当前浏览器是否支持WebSocket
  if ('WebSocket' in window) {
      
  
      //授权
      if(token==null){
         getToken();
      }

      params = {
        appId,
        token,
        model,
        roloeCode,
        continuousDialogue
        
      };
  
      let wsUrl=wsApi+'/ws/question/'+replyId+'?'+buildUrlParams(params)
      console.log(wsUrl)
      ws = new WebSocket(wsUrl);
      let timerId;
      
      //连接成功建立的回调方法
      ws.onopen = function () {
        console.log('WebSocket 连接已打开');
        $("#chatStatus span").text("在线")
        timerId = setTimeout(function() {
          ws.send('ping');
        }, 5000);
      };
      
      //接收到消息的回调方法
      ws.onmessage = function (event) {
      
        // 心跳机制保存连接
        if (event.data === 'ping') {
          ws.send('pong');
        } else if (event.data === 'pong') {
          console.log("💓")
          clearTimeout(timerId);
          timerId = setTimeout(function() {
            ws.send('ping');
          }, 5000);
        }else{
          analysisMsg(event)
        }
      };
      
      //连接关闭的回调方法
      ws.onclose = function () {
        alert("点击应用接入绑定自己OPEN AI账号在线体验。或者通过开放API集成到自己的APP")
        console.log('WebSocket 连接已关闭');
        $("#chatStatus span").text("离线")
      };
      
      //连接发生错误的回调方法
      ws.onerror = function () {
        console.log("WebSocket连接发生错误")
        $("#chatStatus span").text("离线")
        alert("会话连接异常已断开，请刷新重新连接")
  
      };
  
      //监听窗口关闭事件，当窗口关闭时，主动去关闭websocket连接，
      //防止连接还没断开就关闭窗口，server端会抛异常。
      window.onbeforeunload = function () {
        closeWebSocket();
      }
  
  }
  else {
      alert('当前浏览器 Not support websocket')
  }
  
  function reloadWebsocket(params){
    
    let wsUrl=wsApi+'/ws/question/'+replyId+'?'+buildUrlParams(params)
    console.log(wsUrl)
     ws = new WebSocket(wsUrl);
  
  
  
    //连接成功建立的回调方法
    ws.onopen = function () {
      console.log('WebSocket 连接已打开');
      $("#chatStatus span").text("在线")
      timerId = setTimeout(function() {
        ws.send('ping');
      }, 5000);
    };
    
    //接收到消息的回调方法
    ws.onmessage = function (event) {
   
      // 心跳机制保存连接
      if (event.data === 'ping') {
        ws.send('pong');
      } else if (event.data === 'pong') {
        console.log("💓")
        clearTimeout(timerId);
        timerId = setTimeout(function() {
          ws.send('ping');
        }, 5000);
      }else{
        analysisMsg(event)
      }
    };
    
    //连接关闭的回调方法
    ws.onclose = function () {
      console.log('WebSocket 连接已关闭');
      $("#chatStatus span").text("离线")
    };
    
    //连接发生错误的回调方法
    ws.onerror = function () {
      console.log("WebSocket连接发生错误")
      $("#chatStatus span").text("离线")
      alert("会话连接异常已断开，请刷新重新连接")
    };
  }
  
  
  
  //获取token
  function  getToken(){
    let interface='/user/token';
    let param={
        appId,
        secret: CryptoJS.MD5(appId+secret).toString()
    }
    let url=api+interface+'?'+buildUrlParams(param)
    
    $.ajax({
      url:   url,
      type: 'GET',
      async: false, // 将async设置为false即可实现同步请求
      success: function(data) {
        if(data.success){
          // 缓存字符串'wqteam' 到 'username' 中, 超时时间100秒
          token=data.data.token
          wsCache.set('token', data.data.token, {exp : data.data.expiration}); 
       }else{
         alert(data.message +"OPEN AI 账号无效授权失败请登录 http://openai.soboys.cn/login")
         return ;
       }
      },
      error: function(xhr, status, error) {
        console.error(error);
        return ;
      }
      
    });
  
  }
  
  
  //关闭WebSocket连接
  function closeWebSocket() {
    ws.close();
    console.log("关闭websocket连接")
  }
  
    
  
  
    // marked.js设置语法高亮
    marked.setOptions({
      highlight: function (code, language) {
          const validLanguage = hljs.getLanguage(language) ? language : 'javascript';
          return hljs.highlight(code, { language: validLanguage }).value;
      },
    });
  
    // 转义html代码(对应字符转移为html实体)，防止在浏览器渲染
    function escapeHtml(html) {
      let text = document.createTextNode(html);
      let div = document.createElement('div');
      div.appendChild(text);
      return div.innerHTML;
    }
    
    // 添加请求消息到窗口
    function addRequestMessage(message) {
      
      chatInput.val('');
      let escapedMessage = escapeHtml(message);  // 对请求message进行转义，防止输入的是html而被浏览器渲染https://images.soboys.cn/202305252344275.png
      let requestMessageElement = $('<div class="row message-bubble"><img class="chat-icon" src="https://images.soboys.cn/202305252344275.png"><div class="message-text request">' +  escapedMessage + '</div></div>');
      chatWindow.append(requestMessageElement);
      let responseMessageElement = $('<div class="row message-bubble"><img class="chat-icon" src="https://images.soboys.cn/202305252341819.png"><div class="message-text response"><span class="loading-icon"><i class="fa fa-spinner fa-pulse fa-2x"></i></span></div></div>');
      chatWindow.append(responseMessageElement);
      chatWindow.scrollTop(chatWindow.prop('scrollHeight'));
    }

  
    //添加添加请求消息和等待到消息窗口适合画图
    function addRequestLoadMessage(message) {
      
      chatInput.val('');
      let escapedMessage = escapeHtml(message);  // 对请求message进行转义，防止输入的是html而被浏览器渲染https://images.soboys.cn/202305252344275.png
      let requestMessageElement = $('<div class="row message-bubble"><img class="chat-icon" src="https://images.soboys.cn/202305252344275.png"><div class="message-text request">' +  escapedMessage + '</div></div>');
      chatWindow.append(requestMessageElement);

      //画图加入额外的提示等待信息
      addResponseMessage("AI画图可能存在较慢情况请耐心等待2-3分钟切勿刷新重复点击")

      let responseMessageElement = $('<div class="row message-bubble"><img class="chat-icon" src="https://images.soboys.cn/202305252341819.png"><div class="message-text response"><span class="loading-icon"><i class="fa fa-spinner fa-pulse fa-2x"></i></span></div></div>');
      chatWindow.append(responseMessageElement);
      chatWindow.scrollTop(chatWindow.prop('scrollHeight'));
    }

    
    // 添加响应消息到窗口,流式响应此方法会执行多次
    function addResponseMessage(message) {
     
      let lastResponseElement = $(".message-bubble .response").last();
      lastResponseElement.empty();
      let escapedMessage;
      // 处理流式消息中的代码块
      let codeMarkCount = 0;
      let index = message.indexOf('```');
      while (index !== -1) {
          codeMarkCount ++ ;
          index = message.indexOf('```', index + 3);
      }
      if(codeMarkCount % 2 == 1  ){  // 有未闭合的 code
        escapedMessage = marked.parse(message + '\n\n```'); 
      }else if(codeMarkCount % 2 == 0 && codeMarkCount != 0){
        escapedMessage = marked.parse(message);  // 响应消息markdown实时转换为html
      }else if(codeMarkCount == 0){ 
         // 输出的代码有可能不是markdown格式，所以只要没有markdown代码块的内容，都用escapeHtml处理后再转换
        escapedMessage = marked.parse(escapeHtml(message));
      }
      lastResponseElement.append(escapedMessage);
      chatWindow.scrollTop(chatWindow.prop('scrollHeight'));
    }

  
    //添加响应图片
    function addResponsPic(message){
      let lastResponseElement = $(".message-bubble .response").last();
      lastResponseElement.empty();
      lastResponseElement.append(message);
      chatWindow.scrollTop(chatWindow.prop('scrollHeight'));
  
      
    
    }
  
    // 添加失败信息到窗口
    function addFailMessage(message) {
      let lastResponseElement = $(".message-bubble .response").last();
      lastResponseElement.empty();
      lastResponseElement.append('<p class="error">' + message + '</p>');
      chatWindow.scrollTop(chatWindow.prop('scrollHeight'));
      messages.pop() // 失败就让用户输入信息从数组删除
    }
    
    //发送消息
  function send(message) {
    ws.send(message);
  }
  
  //画图
  function paint(message){
    let interface='/pic/GenImage';
    let param={
        desc:message,
        model
    }
   let  headers= {
      "appId": appId,
      "token": token
    }
  
    let url=api+interface;
    $.ajax({
      url:   url,
      type: 'POST',
      contentType: 'application/json',
      async: true, // 将async设置为false即可实现同步请求
      data: JSON.stringify(param),
      headers,
      success: function(data) {
        let pic="";
        if(data.success){
          if(model==2){
             pic=data.data.image.midjourneyImgEntry.image_url
          }else{
             pic=data.data.image.gptImgEntry.data[0].url
          }
          
           let html='<p><img class="ai-pic"  src="'+pic+'"></p>'
           addResponsPic(html);
           chatInput.val('');
            // 收到回复，让按钮可点击
            chatBtn.attr('disabled',false)
            // 重新绑定键盘事件
            chatInput.on("keydown",handleEnter); 
  
            messages.push({"role": "assistant", "content": html,"model":2});
            // 判断是否本地存储历史会话
            if(archiveSession==1){
              localStorage.setItem("session",JSON.stringify(messages));
            }
       }else{
          chatInput.val('');
          // 收到回复，让按钮可点击
          chatBtn.attr('disabled',false)
          // 重新绑定键盘事件
          chatInput.on("keydown",handleEnter); 
          addResponseMessage(data.message+"点击应用接入绑定OPEN AI账号 每天获取免费体验额度")
         
         return ;
       }
      },
      error: function(xhr, status, error) {
        console.error(error);
        return ;
      }
      
    });
  }
  
  
  
let text='';
function analysisMsg(message){

  let json_data = JSON.parse(message.data)

  if(json_data.code=='OK'){
    if (json_data.content == "[DONE]") {
      chatInput.val('');
      // 收到回复，让按钮可点击
      chatBtn.attr('disabled',false)
      // 重新绑定键盘事件
      chatInput.on("keydown",handleEnter); 
      messages.push({"role": "assistant", "content": text});
      // 判断是否本地存储历史会话
      if(archiveSession==1){
        localStorage.setItem("session",JSON.stringify(messages));
      }
      text = '';
      return;
    }
    if (json_data.content == null || json_data.content == 'null') {
        return;
      }
    text = text + json_data.content;
    addResponseMessage(text);
    
  }else{
    //鉴权过期重新获取token
      if(json_data.code=='UNAUTHORIZED'){
        console.log(json_data.message)
        getToken();
        params = {
          appId,
          continuousDialogue,
          model,
          token
        };
        $("#chatStatus span").text("离线")
        alert("会话离线请刷新连接")
        //reloadWebsocket(params)
        return;
      }else if(json_data.code="ChatGptError"){
        chatInput.val('');
        // 收到回复，让按钮可点击
        chatBtn.attr('disabled',false)
        // 重新绑定键盘事件
        chatInput.on("keydown",handleEnter); 
        addResponseMessage(json_data.content+"点击应用接入绑定OPEN AI账号 每天获取免费体验额度");
      }
  }
  
}
  
    // 处理用户输入
    chatBtn.click(function() {
      // 解绑键盘事件
      chatInput.off("keydown",handleEnter);
      
      // 保存api key与对话数据
      let data;
    
  
      let message = chatInput.val();
      if (message.length == 0){
        // 重新绑定键盘事件
        chatInput.on("keydown",handleEnter);
        return
      }
  
      addRequestMessage(message);
      // 将用户消息保存到数组
      messages.push({"role": "user", "content": message})
      // 收到回复前让按钮不可点击
      chatBtn.attr('disabled',true)
      if(model=='2'||model=='3'){
        alert("AI绘画可能会存在较慢情况请耐心2-3分钟不要重复点击和刷新")
        paint(message)
      }else{
        send(message);
      }
    });  
  
    // Enter键盘事件
    function handleEnter(e){
      if (e.keyCode==13){
        chatBtn.click();
        e.preventDefault();  //避免回车换行
      }
    }
  
    // 绑定Enter键盘事件
    chatInput.on("keydown",handleEnter);
  
  
    // 设置栏宽度自适应
    let width = $('.function .others').width();
    $('.function .settings .dropdown-menu').css('width', width);
    
    $(window).resize(function() {
      width = $('.function .others').width();
      $('.function .settings .dropdown-menu').css('width', width);
    }); 
  
  
    //保存用户回话记录
    $('#chck-1').click(function() {
      if ($(this).prop('checked')) {
          // 开启状态的操作
          archiveSession=1;
          localStorage.setItem('archiveSession', archiveSession);
          if(messages.length != 0){
            localStorage.setItem("session",JSON.stringify(messages));
          }
      } else {
          // 关闭状态的操作
           archiveSession=0;
          localStorage.setItem('archiveSession', archiveSession);
          localStorage.removeItem("session");
      }
    });
    
    // 加载历史保存会话
    function loadHistoryMsg(){
      if(archiveSession==1&&messages!=null&&messages!=''){
          $.each(messages, function(index, item) {
            if (item.role === 'user') {
              addRequestMessage(item.content)
            } else if (item.role === 'assistant') {
              if(item.model!=null&&item.model!='undefind'){
                addResponsPic(item.content)
              }else{
                addResponseMessage(item.content)
              }
            }
          });
        
      }
     
    }
    
//模型选择按钮  
function defaultSelModel(value){
  if(value!=1&&value!=2&value!=4&value!=3){
    value=1;
    model=1;
    localStorage.setItem('model',model);

  }
  var all_options = document.getElementById("selModel").options;
  for (i=0; i<all_options.length; i++){
      if (all_options[i].value == value)  // 根据option标签的ID来进行判断  测试的代码这里是两个等号
      {
        all_options[i].selected = true;
        break;
      }
  }
};    

//记住对话内容按钮
function showDelfualtArchiveSession(){
  if(archiveSession == 1){
    $("#chck-1").prop("checked", true);
  }else if(archiveSession==0){
    $("#chck-1").prop("checked", false);
  }else{
    archiveSession=1;
    localStorage.setItem('archiveSession',archiveSession);
    $("#chck-1").prop("checked", true);

  }
};


//连续对话按钮   
function showDelfualtContinuousDialogue(){
  if(continuousDialogue == 1){
    $("#chck-2").prop("checked", true);
  }else if(continuousDialogue==0){
    $("#chck-2").prop("checked", false);
  }else {
    continuousDialogue=1;
    localStorage.setItem('continuousDialogue',continuousDialogue);
  }
}  
   
  
    //开启连续对话
    $('#chck-2').click(function() {
      if ($(this).prop('checked')) {
          localStorage.setItem('continuousDialogue', 1);
          continuousDialogue=1;
          params = {
            appId,
            token,
            continuousDialogue,
            model
          };
          reloadWebsocket(params)
  
      } else {
         continuousDialogue=0;
        localStorage.setItem('continuousDialogue', 0);
        params = {
          appId,
          token,
          continuousDialogue,
          model
        };
        reloadWebsocket(params)
      }
    });
  
    // 删除功能
    $(".delete a").click(function(){
      chatWindow.empty();
      $(".answer .tips").css({"display":"flex"});
      messages = [];
      localStorage.removeItem("session");
    });
  
    // 截图功能
    $(".screenshot a").click(function() {
      // 创建副本元素
      const clonedChatWindow = chatWindow.clone();
      clonedChatWindow.css({
        position: "absolute",
        left: "-9999px",
        overflow: "visible",
        height: "auto"
      });
      $("body").append(clonedChatWindow);
      // 截图
      html2canvas(clonedChatWindow[0], {
        allowTaint: false,
        useCORS: true,
        scrollY: 0,
      }).then(function(canvas) {
        // 将 canvas 转换成图片
        const imgData = canvas.toDataURL('image/png');
        // 创建下载链接
        const link = document.createElement('a');
        link.download = "screenshot_" + Math.floor(Date.now() / 1000) + ".png";
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        clonedChatWindow.remove();
      });
    });
  
    //对话模型选择
  
    $("#selModel").on("change",function(){
      model = this.value;
      params = {
        appId,
        token,
        continuousDialogue,
        model
      };
      localStorage.setItem('model', model);
      reloadWebsocket(params)
  
    })

    //应用接入
    $("#bindAccount").click(function(){
       // 弹出自定义弹窗
        layer.open({
          area: ['400px', '400px'],
          title: '绑定OPEN AI开发者账号',
          content: '<div><label>应用ID：</label><input style="width:100%" type="text" id="appId"><br><label>秘钥ID：</label><input style="width:100%" type="password" id="appSecret"></div>',
          btn: ['确认', '取消'],
          yes: function(index, elem){
            // 点击确认后的回调函数
             appId = $('#appId').val().trim(); // 获取应用ID，去掉首尾空格
             secret = $('#appSecret').val().trim(); // 获取秘钥，去掉首尾空格
              wsCache.delete('token');
              localStorage.clear();

              localStorage.setItem('appId',appId);
              localStorage.setItem('secret',secret)
              window.location.reload();
            // 在这里可以对输入内容进行验证和处理
            
            // 关闭弹窗
            layer.close(index);
          }
        });

    })
    // 初始化默认平台账号
    function defaultAccount(){
      if(appId==null||appId==''||appId=='undefind'){
        appId='20230609051455A001';
        secret='K20c4e7741418be6cbd773416240492';
      }
    }
  
    //保存用户消息
    function saveHistoryMsg(){
      let messages=[];
      const messagesList = JSON.parse(localStorage.getItem("session"));
      if(messagesList){
        messages=messagesList
      }

      return messages;
    }
   
  });