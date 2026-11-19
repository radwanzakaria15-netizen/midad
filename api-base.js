(function(){
  if(!/github\.io$/.test(location.hostname))return;
  // ضع رابط مشروعك على Cloudflare هنا (بدون شرطة في النهاية)
  const BASE='https://midad2.pages.dev';
  const orig=window.fetch;
  window.fetch=function(u,o){
    if(typeof u==='string'&&u.startsWith('/api/'))u=BASE+u;
    return orig.call(this,u,o);
  };
})();
