function buildUrlParams(params) {
    let urlParams = '';
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        const value = encodeURIComponent(params[key]);
        urlParams += `${key}=${value}&`;
      }
    }
    // Remove the last '&' character
    return urlParams.slice(0, -1);
  }

  function generateUUID(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
}