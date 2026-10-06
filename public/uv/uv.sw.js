(()=>{var p=self.Ultraviolet,U=["cross-origin-embedder-policy","cross-origin-opener-policy","cross-origin-resource-policy","content-security-policy","content-security-policy-report-only","expect-ct","feature-policy","origin-isolation","strict-transport-security","upgrade-insecure-requests","x-content-type-options","x-download-options","x-frame-options","x-permitted-cross-domain-policies","x-powered-by","x-xss-protection"],C=["GET","HEAD"],v=class extends p.EventEmitter{constructor(e=__uv$config){super(),e.prefix||(e.prefix="/service/"),this.config=e,this.bareClient=new p.BareClient}route({request:e}){return!!e.url.startsWith(location.origin+this.config.prefix)}async fetch({request:e}){let o;try{if(!e.url.startsWith(location.origin+this.config.prefix))return await fetch(e);let t=new p(this.config);typeof this.config.construct=="function"&&this.config.construct(t,"service");let f=await t.cookie.db();t.meta.origin=location.origin,t.meta.base=t.meta.url=new URL(t.sourceUrl(e.url));let s=new x(e,t,C.includes(e.method.toUpperCase())?null:await e.blob());if(t.meta.url.protocol==="blob:"&&(s.blob=!0,s.base=s.url=new URL(s.url.pathname)),e.referrer&&e.referrer.startsWith(location.origin)){let i=new URL(t.sourceUrl(e.referrer));(s.headers.origin||t.meta.url.origin!==i.origin&&e.mode==="cors")&&(s.headers.origin=i.origin),s.headers.referer=i.href}let l=await t.cookie.getCookies(f)||[],c=t.cookie.serialize(l,t.meta,!1);s.headers["user-agent"]=navigator.userAgent,c&&(s.headers.cookie=c);let g=new m(s,null,null);if(this.emit("request",g),g.intercepted)return g.returnValue;o=s.blob?"blob:"+location.origin+s.url.pathname:s.url;let d=await this.bareClient.fetch(o,{headers:s.headers,method:s.method,body:s.body,credentials:s.credentials,mode:s.mode,cache:s.cache,redirect:s.redirect}),r=new w(s,d),h=new m(r,null,null);if(this.emit("beforemod",h),h.intercepted)return h.returnValue;for(let i of U)r.headers[i]&&delete r.headers[i];if(delete r.headers["content-encoding"],delete r.headers["content-length"],r.headers.location&&(r.headers.location=t.rewriteUrl(r.headers.location)),["document","iframe"].includes(e.destination)){let i=r.getHeader("content-disposition");if(!/\s*?((inline|attachment);\s*?)filename=/i.test(i)){let n=/^\s*?attachment/i.test(i)?"attachment":"inline",[b]=new URL(d.finalURL).pathname.split("/").slice(-1);r.headers["content-disposition"]=`${n}; filename=${JSON.stringify(b)}`}}if(r.headers["set-cookie"]&&(Promise.resolve(t.cookie.setCookies(r.headers["set-cookie"],f,t.meta)).then(()=>{self.clients.matchAll().then(function(i){i.forEach(function(n){n.postMessage({msg:"updateCookies",url:t.meta.url.href})})})}),delete r.headers["set-cookie"]),r.body)switch(e.destination){case"script":r.body=t.js.rewrite(await d.text());break;case"worker":{let i=[t.bundleScript,t.clientScript,t.configScript,t.handlerScript].map(n=>JSON.stringify(n)).join(",");r.body=`if (!self.__uv) {
                                ${t.createJsInject(t.cookie.serialize(l,t.meta,!0),e.referrer)}
                            importScripts(${i});
                            }
`,r.body+=t.js.rewrite(await d.text())}break;case"style":r.body=t.rewriteCSS(await d.text());break;case"iframe":case"document":if(r.getHeader("content-type")&&r.getHeader("content-type").startsWith("text/html")){let i=await d.text();if(Array.isArray(this.config.inject)){let n=i.indexOf("<head>"),b=i.indexOf("<HEAD>"),y=i.indexOf("<body>"),k=i.indexOf("<BODY>"),S=new URL(o),O=this.config.inject;for(let u of O)new RegExp(u.host).test(S.host)&&(u.injectTo==="head"?(n!==-1||b!==-1)&&(i=i.slice(0,n)+`${u.html}`+i.slice(n)):u.injectTo==="body"&&(y!==-1||k!==-1)&&(i=i.slice(0,y)+`${u.html}`+i.slice(y)))}r.body=t.rewriteHtml(i,{document:!0,injectHead:t.createHtmlInject(t.handlerScript,t.bundleScript,t.clientScript,t.configScript,t.cookie.serialize(l,t.meta,!0),e.referrer)})}break;default:break}return s.headers.accept==="text/event-stream"&&(r.headers["content-type"]="text/event-stream"),crossOriginIsolated&&(r.headers["Cross-Origin-Embedder-Policy"]="require-corp"),this.emit("response",h),h.intercepted?h.returnValue:new Response(r.body,{headers:r.headers,status:r.status,statusText:r.statusText})}catch(t){return["document","iframe"].includes(e.destination)?(console.error(t),T(t,o)):new Response(void 0,{status:500})}}static Ultraviolet=p};self.UVServiceWorker=v;var w=class{constructor(e,o){this.request=e,this.raw=o,this.ultraviolet=e.ultraviolet,this.headers={};let t=o.rawHeaders,f=Array.isArray(t)?t:Object.entries(t||{});for(let[s,l]of f){let c=s.toLowerCase();c in this.headers?this.headers[c]=[].concat(this.headers[c],l):this.headers[c]=l}this.status=o.status,this.statusText=o.statusText,this.body=o.body}get url(){return this.request.url}get base(){return this.request.base}set base(e){this.request.base=e}getHeader(e){return Array.isArray(this.headers[e])?this.headers[e][0]:this.headers[e]}},x=class{constructor(e,o,t=null){this.ultraviolet=o,this.request=e,this.headers=Object.fromEntries(e.headers.entries()),this.method=e.method,this.body=t||null,this.cache=e.cache,this.redirect=e.redirect,this.credentials="omit",this.mode=e.mode==="cors"?e.mode:"same-origin",this.blob=!1}get url(){return this.ultraviolet.meta.url}set url(e){this.ultraviolet.meta.url=e}get base(){return this.ultraviolet.meta.base}set base(e){this.ultraviolet.meta.base=e}},m=class{#e;#t;constructor(e={},o=null,t=null){this.#e=!1,this.#t=null,this.data=e,this.target=o,this.that=t}get intercepted(){return this.#e}get returnValue(){return this.#t}respondWith(e){this.#t=e,this.#e=!0}};function E(a,e){let o=`
        errorTrace.value = ${JSON.stringify(a)};
        fetchedURL.textContent = ${JSON.stringify(e)};
        for (const node of document.querySelectorAll("#uvHostname")) node.textContent = ${JSON.stringify(location.hostname)};
        reload.addEventListener("click", () => location.reload());
        uvVersion.textContent = ${JSON.stringify("3.2.10")};
        uvBuild.textContent = ${JSON.stringify("62afe61")};
    `;return`<!DOCTYPE html>
        <html>
        <head>
        <meta charset='utf-8' />
        <title>Error</title>
        <style>
        * { background-color: white }
        </style>
        </head>
        <body>
        <h1 id='errorTitle'>Error processing your request</h1>
        <hr />
        <p>Failed to load <b id="fetchedURL"></b></p>
        <p id="errorMessage">Internal Server Error</p>
        <textarea id="errorTrace" cols="40" rows="10" readonly></textarea>
        <p>Try:</p>
        <ul>
        <li>Checking your internet connection</li>
        <li>Verifying you entered the correct address</li>
        <li>Clearing the site data</li>
        <li>Contacting <b id="uvHostname"></b>'s administrator</li>
        <li>Verify the server isn't censored</li>
        </ul>
        <p>If you're the administrator of <b id="uvHostname"></b>, try:</p>
        <ul>
        <li>Restarting your server</li>
        <li>Updating Ultraviolet</li>
        <li>Troubleshooting the error on the <a href="https://github.com/titaniumnetwork-dev/Ultraviolet" target="_blank">GitHub repository</a></li>
        </ul>
        <button id="reload">Reload</button>
        <hr />
        <p><i>Ultraviolet v<span id="uvVersion"></span> (build <span id="uvBuild"></span>)</i></p>
        <script src="${"data:application/javascript,"+encodeURIComponent(o)}"><\/script>
        </body>
        </html>
        `}function T(a,e){let o={"content-type":"text/html"};return crossOriginIsolated&&(o["Cross-Origin-Embedder-Policy"]="require-corp"),new Response(E(String(a),e),{status:500,headers:o})}})();
//# sourceMappingURL=uv.sw.js.map
