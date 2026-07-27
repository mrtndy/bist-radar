// BIST Radar — demo veri motoru. Tüm seriler deterministik üretilir; GERÇEK piyasa verisi DEĞİLDİR.
const TICKERS = [
["AKBNK","Akbank","Bankacılık",1],["GARAN","Garanti BBVA","Bankacılık",2],["ISCTR","İş Bankası (C)","Bankacılık",0],["YKBNK","Yapı Kredi","Bankacılık",1],["VAKBN","VakıfBank","Bankacılık",1],["HALKB","Halkbank","Bankacılık",1],["TSKB","TSKB","Bankacılık",0],["SKBNK","Şekerbank","Bankacılık",0],["ALBRK","Albaraka Türk","Bankacılık",0],
["KCHOL","Koç Holding","Holding",2],["SAHOL","Sabancı Holding","Holding",1],["DOHOL","Doğan Holding","Holding",0],["AGHOL","AG Anadolu Grubu","Holding",2],["ALARK","Alarko Holding","Holding",1],["ENKAI","Enka İnşaat","Holding",1],["TKFEN","Tekfen Holding","Holding",1],["GSDHO","GSD Holding","Holding",0],["NTHOL","Net Holding","Holding",1],["GLYHO","Global Yat. Holding","Holding",0],["ECZYT","Eczacıbaşı Yatırım","Holding",1],
["THYAO","Türk Hava Yolları","Havacılık",2],["PGSUS","Pegasus","Havacılık",3],["TAVHL","TAV Havalimanları","Havacılık",2],["CLEBI","Çelebi Hava Servisi","Havacılık",3],
["ASELS","Aselsan","Savunma",2],["OTKAR","Otokar","Savunma",3],["SDTTR","SDT Uzay ve Savunma","Savunma",2],["PAPIL","Papilon Savunma","Savunma",1],
["LOGO","Logo Yazılım","Teknoloji",2],["KAREL","Karel Elektronik","Teknoloji",1],["NETAS","Netaş","Teknoloji",1],["INDES","İndeks Bilgisayar","Teknoloji",1],["DESPC","Despec Bilgisayar","Teknoloji",1],["ARENA","Arena Bilgisayar","Teknoloji",1],["LINK","Link Bilgisayar","Teknoloji",2],["FONET","Fonet Bilgi Tek.","Teknoloji",1],["MIATK","Mia Teknoloji","Teknoloji",1],["REEDR","Reeder Teknoloji","Teknoloji",1],["PENTA","Penta Teknoloji","Teknoloji",2],["AZTEK","Aztek Teknoloji","Teknoloji",1],["KFEIN","Kafein Yazılım","Teknoloji",1],["FORTE","Forte Bilgi Tek.","Teknoloji",1],["DGATE","Datagate Bilgisayar","Teknoloji",1],["ESCOM","Escort Teknoloji","Teknoloji",1],["OBASE","Obase Bilgisayar","Teknoloji",1],
["TOASO","Tofaş","Otomotiv",2],["FROTO","Ford Otosan","Otomotiv",3],["DOAS","Doğuş Otomotiv","Otomotiv",2],["TTRAK","Türk Traktör","Otomotiv",3],["KARSN","Karsan","Otomotiv",0],["TMSN","Tümosan","Otomotiv",1],["BRISA","Brisa","Otomotiv",2],["GOODY","Goodyear","Otomotiv",1],["KORDS","Kordsa","Otomotiv",1],
["ARCLK","Arçelik","Dayanıklı Tüketim",2],["VESTL","Vestel","Dayanıklı Tüketim",1],["VESBE","Vestel Beyaz Eşya","Dayanıklı Tüketim",1],
["EREGL","Ereğli Demir Çelik","Demir-Çelik",1],["KRDMD","Kardemir (D)","Demir-Çelik",1],["ISDMR","İskenderun D.Ç.","Demir-Çelik",1],["CEMTS","Çemtaş","Demir-Çelik",1],
["KOZAA","Koza Anadolu","Madencilik",1],["KOZAL","Koza Altın","Madencilik",1],["IPEKE","İpek Doğal Enerji","Madencilik",1],["PRKME","Park Elektrik","Madencilik",1],
["TUPRS","Tüpraş","Enerji",2],["AKSEN","Aksa Enerji","Enerji",1],["ZOREN","Zorlu Enerji","Enerji",0],["ODAS","Odaş Elektrik","Enerji",0],["AYDEM","Aydem Enerji","Enerji",0],["ENJSA","Enerjisa","Enerji",1],["GWIND","Galata Wind","Enerji",1],["BIOEN","Biotrend Enerji","Enerji",0],["GESAN","Girişim Elektrik","Enerji",1],["KONTR","Kontrolmatik","Enerji",1],["ASTOR","Astor Enerji","Enerji",2],["EUPWR","Europower Enerji","Enerji",1],["CWENE","CW Enerji","Enerji",1],["NATEN","Naturel Enerji","Enerji",1],["AHGAZ","Ahlatcı Doğalgaz","Enerji",0],["MAGEN","Margün Enerji","Enerji",0],["YEOTK","Yeo Teknoloji Enerji","Enerji",2],["ORGE","Orge Enerji","Enerji",1],
["PETKM","Petkim","Petrokimya",0],["AYGAZ","Aygaz","Petrokimya",2],["SASA","Sasa Polyester","Petrokimya",0],["AKSA","Aksa Akrilik","Petrokimya",1],["HEKTS","Hektaş","Petrokimya",0],["GUBRF","Gübre Fabrikaları","Petrokimya",2],["BAGFS","Bagfaş","Petrokimya",1],["EGGUB","Ege Gübre","Petrokimya",2],["ALKIM","Alkim Kimya","Petrokimya",1],
["SISE","Şişecam","Çimento-Cam",1],["AKCNS","Akçansa","Çimento-Cam",2],["CIMSA","Çimsa","Çimento-Cam",1],["OYAKC","Oyak Çimento","Çimento-Cam",1],["NUHCM","Nuh Çimento","Çimento-Cam",2],["BTCIM","Batıçim","Çimento-Cam",1],["GOLTS","Göltaş","Çimento-Cam",3],["BUCIM","Bursa Çimento","Çimento-Cam",1],
["BIMAS","BİM","Perakende",3],["MGROS","Migros","Perakende",3],["SOKM","Şok Marketler","Perakende",1],["MAVI","Mavi Giyim","Perakende",1],["TKNSA","Teknosa","Perakende",1],["CRFSA","CarrefourSA","Perakende",1],["EBEBK","e-bebek","Perakende",1],
["ULKER","Ülker","Gıda-İçecek",2],["AEFES","Anadolu Efes","Gıda-İçecek",2],["CCOLA","Coca-Cola İçecek","Gıda-İçecek",3],["TATGD","Tat Gıda","Gıda-İçecek",1],["PNSUT","Pınar Süt","Gıda-İçecek",2],["BANVT","Banvit","Gıda-İçecek",2],["KRVGD","Kervan Gıda","Gıda-İçecek",1],
["TTKOM","Türk Telekom","Telekom",1],["TCELL","Turkcell","Telekom",2],
["EKGYO","Emlak Konut GYO","GYO",0],["ISGYO","İş GYO","GYO",0],["TRGYO","Torunlar GYO","GYO",1],["OZKGY","Özak GYO","GYO",1],["HLGYO","Halk GYO","GYO",0],["VKGYO","Vakıf GYO","GYO",0],["KLGYO","Kiler GYO","GYO",1],["AKSGY","Akiş GYO","GYO",0],["PEKGY","Peker GYO","GYO",0],
["SELEC","Selçuk Ecza","Sağlık",1],["DEVA","Deva Holding","Sağlık",2],["ECILC","Eczacıbaşı İlaç","Sağlık",1],["MPARK","MLP Care","Sağlık",3],["LKMNH","Lokman Hekim","Sağlık",1],["GENIL","Gen İlaç","Sağlık",1],["TRILC","Türk İlaç Serum","Sağlık",1],
["ISMEN","İş Yatırım","Finans",1],["GEDIK","Gedik Yatırım","Finans",0],["INFO","İnfo Yatırım","Finans",1],["OSMEN","Osmanlı Yatırım","Finans",1],["A1CAP","A1 Capital","Finans",1],["ISFIN","İş Fin. Kiralama","Finans",1],["LIDFA","Lider Faktoring","Finans",0],["GARFA","Garanti Faktoring","Finans",1],
["TURSG","Türkiye Sigorta","Sigorta",1],["AKGRT","Aksigorta","Sigorta",0],["ANHYT","Anadolu Hayat","Sigorta",2],["ANSGR","Anadolu Sigorta","Sigorta",2],["AGESA","AgeSA","Sigorta",2],["RAYSG","Ray Sigorta","Sigorta",2],
["YUNSA","Yünsa","Tekstil",1],["YATAS","Yataş","Tekstil",1],["DAGI","Dağı Giyim","Tekstil",0],["DESA","Desa Deri","Tekstil",1],["SKTAS","Söktaş","Tekstil",0],
["MAALT","Marmaris Altınyunus","Turizm",2],["AYCES","Altınyunus Çeşme","Turizm",2],["TEKTU","Tek-Art Turizm","Turizm",0],
["KARTN","Kartonsan","Ambalaj-Boya",2],["BAKAB","Bak Ambalaj","Ambalaj-Boya",1],["DYOBY","DYO Boya","Ambalaj-Boya",0],["MRSHL","Marshall Boya","Ambalaj-Boya",2]
];
const AY=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const TIERS=[[2.5,14],[15,80],[80,350],[350,1200]];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=1779033703;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}return h>>>0}
function gauss(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function sma(a,n){const o=new Array(a.length).fill(null);let s=0;for(let i=0;i<a.length;i++){s+=a[i];if(i>=n)s-=a[i-n];if(i>=n-1)o[i]=s/n}return o}
function ema(a,n){const o=new Array(a.length).fill(null);const k=2/(n+1);let e=a[0];for(let i=0;i<a.length;i++){e=i===0?a[0]:a[i]*k+e*(1-k);o[i]=e}return o}
function genSeries(sym,tfk,tier,arch){
  const r=mulberry32(hash(sym+":"+tfk));
  const n=tfk==="H"?160:tfk==="S"?150:260;
  const [lo,hi]=TIERS[tier];let p=lo*Math.pow(hi/lo,r());
  const volBase=(4e5+r()*6e6)*(tier>=2?0.35:1);
  const sVol=(0.011+r()*0.02)*(tfk==="S"?0.4:tfk==="H"?1.8:1);
  const segs=3+Math.floor(r()*3);const drifts=[];for(let i=0;i<segs;i++)drifts.push((r()-0.47)*(tfk==="H"?0.014:0.007));
  const bars=[];
  for(let i=0;i<n;i++){
    let mu=drifts[Math.min(segs-1,Math.floor(i/n*segs))],spike=1;
    const t=i-(n-16);
    if(t>=0){const m=tfk==="S"?0.5:1;
      if(arch===0){mu=t<10?-0.013*m:0.014*m;if(t>=10)spike=1.6+0.25*(t-10)}
      else if(arch===1){mu=t<13?0.0005:0.021*m;if(t>=13)spike=2.6}
      else if(arch===2){mu=-0.01*m;spike=t>12?1.5:1}
      else if(arch===3){mu=(t%2?1:-1)*0.006*m}
      else{mu=t<12?0.011*m:-0.006*m;spike=t<12?1.3:0.9}}
    const ret=mu+sVol*gauss(r);
    const c=p*(1+ret);
    const o=p*(1+sVol*0.25*gauss(r));
    const h=Math.max(o,c)*(1+Math.abs(gauss(r))*sVol*0.45);
    const l=Math.min(o,c)*(1-Math.abs(gauss(r))*sVol*0.45);
    const v=volBase*(0.55+r()*0.9+Math.min(3,Math.abs(ret)/sVol)*0.45)*spike;
    bars.push({o,h,l,c,v});p=c;
  }
  return bars;
}
function dateLabels(tfk,n){
  const out=[];const d=new Date(2026,6,24);let hour=18;
  for(let i=0;i<n;i++){
    if(tfk==="S"){out.unshift((hour===18?d.getDate()+" "+AY[d.getMonth()]+" ":"")+String(hour).padStart(2,"0")+":00");hour--;if(hour<10){hour=18;do{d.setDate(d.getDate()-1)}while(d.getDay()===0||d.getDay()===6)}}
    else if(tfk==="H"){out.unshift(d.getDate()+" "+AY[d.getMonth()]);d.setDate(d.getDate()-7)}
    else{out.unshift(d.getDate()+" "+AY[d.getMonth()]);do{d.setDate(d.getDate()-1)}while(d.getDay()===0||d.getDay()===6)}
  }
  return out;
}
function indicators(bars,tfk){
  const C=bars.map(b=>b.c),H=bars.map(b=>b.h),L=bars.map(b=>b.l),V=bars.map(b=>b.v),n=bars.length;
  const e12=ema(C,12),e26=ema(C,26);
  const macd=C.map((_,i)=>e12[i]-e26[i]);const sig=ema(macd,9);const hist=macd.map((m,i)=>m-sig[i]);
  const rsi=new Array(n).fill(null);let ag=0,al=0;
  for(let i=1;i<n;i++){const ch=C[i]-C[i-1],g=Math.max(ch,0),ls=Math.max(-ch,0);
    if(i<=14){ag+=g/14;al+=ls/14;if(i===14)rsi[i]=100-100/(1+ag/(al||1e-9))}
    else{ag=(ag*13+g)/14;al=(al*13+ls)/14;rsi[i]=100-100/(1+ag/(al||1e-9))}}
  const Kraw=new Array(n).fill(null);
  for(let i=13;i<n;i++){let hh=-1e18,ll=1e18;for(let j=i-13;j<=i;j++){hh=Math.max(hh,H[j]);ll=Math.min(ll,L[j])}Kraw[i]=100*(C[i]-ll)/((hh-ll)||1e-9)}
  const smooth=(a,m)=>a.map((_,i)=>{if(i<13+m-1||a[i]==null)return null;let s=0;for(let j=0;j<m;j++)s+=a[i-j];return s/m});
  const K=smooth(Kraw,3),D=smooth(K.map(v=>v==null?0:v),3);
  const tr=new Array(n).fill(0);for(let i=0;i<n;i++)tr[i]=i===0?H[0]-L[0]:Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1]));
  const atr=new Array(n).fill(null);let a14=0;
  for(let i=0;i<n;i++){if(i<14){a14+=tr[i]/14;if(i===13)atr[i]=a14}else{a14=(a14*13+tr[i])/14;atr[i]=a14}}
  const mid=sma(C,20);
  const bbU=new Array(n).fill(null),bbL=new Array(n).fill(null);
  for(let i=19;i<n;i++){let s=0;for(let j=i-19;j<=i;j++)s+=(C[j]-mid[i])**2;const sd=Math.sqrt(s/20);bbU[i]=mid[i]+2*sd;bbL[i]=mid[i]-2*sd}
  const vs=sma(V,20);
  const i=n-1;
  let crossDir=0,crossBars=99;
  for(let j=i;j>0;j--){const s1=Math.sign(macd[j]-sig[j]),s0=Math.sign(macd[j-1]-sig[j-1]);if(s1!==s0&&s1!==0){crossDir=s1;crossBars=i-j;break}}
  const CH=70,s0=n-CH;
  return {
    price:C[i],chg:(C[i]/C[i-1]-1)*100,k:K[i],d:D[i],rsi:rsi[i],
    atrPct:atr[i]/C[i]*100,relVol:V[i]/(vs[i]||V[i]),
    pctB:(C[i]-bbL[i])/((bbU[i]-bbL[i])||1e-9),
    macd:macd[i],msig:sig[i],hist:hist[i],histRising:hist[i]>hist[i-1],kRising:K[i]>K[i-1],
    crossDir,crossBars,volTL:V[i]*C[i],
    hi70:Math.max(...H.slice(s0)),lo70:Math.min(...L.slice(s0)),
    chart:{bars:bars.slice(s0),K:K.slice(s0),D:D.slice(s0),macd:macd.slice(s0),sig:sig.slice(s0),hist:hist.slice(s0),bbU:bbU.slice(s0),bbM:mid.slice(s0),bbL:bbL.slice(s0),volSMA:vs.slice(s0),labels:dateLabels(tfk,n).slice(s0)}
  };
}
function scoreOf(d){
  const B=[];const add=(k,p,n)=>B.push({k,p,n});
  if(d.crossDir>0&&d.crossBars<=3)add("MACD",10,"AL kesişimi ("+d.crossBars+" bar önce)");
  else if(d.crossDir<0&&d.crossBars<=3)add("MACD",-10,"SAT kesişimi ("+d.crossBars+" bar önce)");
  else if(d.hist>0&&d.histRising)add("MACD",8,"Histogram pozitif ve artıyor");
  else if(d.hist>0)add("MACD",4,"Histogram pozitif, ivme zayıflıyor");
  else if(!d.histRising)add("MACD",-8,"Histogram negatif ve azalıyor");
  else add("MACD",-3,"Histogram negatif, toparlanıyor");
  if(d.k<25&&d.k>d.d)add("Stokastik",10,"Aşırı satımdan yukarı dönüyor");
  else if(d.k<25)add("Stokastik",4,"Aşırı satım bölgesi (%K "+Math.round(d.k)+")");
  else if(d.k>80&&d.k<d.d)add("Stokastik",-10,"Aşırı alımdan aşağı dönüyor");
  else if(d.k>80)add("Stokastik",-5,"Aşırı alım bölgesi (%K "+Math.round(d.k)+")");
  else if(d.k>d.d)add("Stokastik",5,"%K, %D üzerinde");
  else add("Stokastik",-3,"%K, %D altında");
  if(d.rsi>70)add("RSI",-7,"Aşırı alım ("+Math.round(d.rsi)+")");
  else if(d.rsi>=55)add("RSI",7,"Güçlü momentum ("+Math.round(d.rsi)+")");
  else if(d.rsi>=45)add("RSI",2,"Nötr bölge ("+Math.round(d.rsi)+")");
  else if(d.rsi>=30)add("RSI",-4,"Zayıf momentum ("+Math.round(d.rsi)+")");
  else add("RSI",3,"Aşırı satım — tepki potansiyeli");
  if(d.relVol>=2)add("Hacim",10,"Ortalamanın "+d.relVol.toFixed(1).replace(".",",")+" katı hacim");
  else if(d.relVol>=1.5)add("Hacim",7,"Ortalamanın belirgin üzerinde");
  else if(d.relVol>=1.2)add("Hacim",4,"Ortalamanın hafif üzerinde");
  else if(d.relVol<0.7)add("Hacim",-5,"Zayıf hacim");
  else add("Hacim",0,"Ortalama seviyede");
  if(d.atrPct>=2&&d.atrPct<=6)add("ATR",6,"İdeal volatilite bandı (%"+d.atrPct.toFixed(1).replace(".",",")+")");
  else if(d.atrPct>8)add("ATR",-5,"Aşırı volatil (%"+d.atrPct.toFixed(1).replace(".",",")+")");
  else if(d.atrPct>6)add("ATR",1,"Yüksek volatilite");
  else add("ATR",-2,"Düşük volatilite (%"+d.atrPct.toFixed(1).replace(".",",")+")");
  if(d.pctB>1&&d.relVol>=1.5)add("Bollinger",6,"Üst bant kırılımı — hacim teyitli");
  else if(d.pctB>1)add("Bollinger",-3,"Üst bant dışı, hacim teyidi yok");
  else if(d.pctB<0)add("Bollinger",3,"Alt bant dışı — tepki potansiyeli");
  else if(d.pctB<=0.25)add("Bollinger",4,"Alt banda yakın");
  else if(d.pctB>=0.85)add("Bollinger",-2,"Üst banda yakın");
  else add("Bollinger",1,"Bant içi normal seyir");
  const score=Math.max(4,Math.min(98,Math.round(50+B.reduce((s,b)=>s+b.p,0))));
  return {score,breakdown:B};
}
const NEWS_T=[
(s,n)=>[s+": pay geri alım programı kapsamında işlem yapıldı","KAP"],
(s,n)=>[n+" 2Ç26 finansal sonuçlarını açıkladı","KAP"],
(s,n)=>[s+": yeni sözleşme/iş ilişkisine dair özel durum açıklaması","KAP"],
(s,n)=>[n+" için analist hedef fiyat güncellemesi","Analiz"],
(s,n)=>[s+": bedelsiz sermaye artırımı başvurusu SPK'da","KAP"],
(s,n)=>[n+" yatırımcı sunumunu yayınladı","Şirket"],
(s,n)=>[s+": iştirak payı devrine ilişkin açıklama","KAP"],
(s,n)=>[n+" yeni tesis yatırımı için teşvik belgesi aldı","Şirket"],
(s,n)=>[s+" hisselerinde yabancı takas oranı yükseldi","Analiz"],
(s,n)=>[n+" temettü dağıtım tarihini açıkladı","KAP"]
];
const MKT_NEWS=[
["TCMB politika faizini değiştirmedi; metinde sıkı duruş korundu","Makro"],
["BIST100 güne alıcılı başladı; bankacılık endeksi öncülük ediyor","Piyasa"],
["Hazine iki ihalede toplam 42 mlr TL borçlandı","Makro"],
["Yabancı takasında bankacılıkta belirgin yükseliş","Piyasa"],
["Küresel risk iştahı pozitif; ABD vadelileri yukarı","Global"],
["Enflasyon beklenti anketinde yıl sonu tahmini aşağı geldi","Makro"],
["Havacılıkta yaz trafiği verileri beklentinin üzerinde","Sektör"],
["Demir-çelikte ihracat fiyatları toparlanıyor","Sektör"],
["Enerji tarafında YEKDEM açıklaması sektörü destekliyor","Sektör"],
["SPK haftalık bülteninde 3 yeni halka arz onayı","Piyasa"]
];
const TIMES=["18:04","17:52","17:31","17:10","16:48","16:25","16:02","15:47","15:21","14:58","14:32","14:07","13:41","13:12","12:50","12:24","11:58","11:31","11:05","10:44","10:18","09:56","09:41","09:33","Dün 18:02","Dün 17:26","Dün 16:40","Dün 15:58","Dün 15:11","Dün 14:30","Dün 13:47","Dün 12:59","Dün 12:14","Dün 11:22","Dün 10:36","2 gün önce"];
function newsFor(sym,name,h){
  const cnt=1+h%4,out=[];
  for(let i=0;i<cnt;i++){const t=NEWS_T[(h>>>(i*3))%NEWS_T.length](sym,name);
    out.push({time:TIMES[(h>>>(i*2))%TIMES.length],src:t[1],text:t[0]})}
  return out;
}
export function build(){
  const stocks=TICKERS.map(([sym,name,sector,tier])=>{
    const h=hash(sym),arch=h%5,tf={};
    for(const k of ["G","H","S"]){const d=indicators(genSeries(sym,k,tier,arch),k);Object.assign(d,scoreOf(d));tf[k]=d}
    const news=newsFor(sym,name,h);
    return {sym,name,sector,tier,news,newsCount:news.length,tf};
  });
  const hot=stocks.filter(s=>hash(s.sym)%3===0).slice(0,20);
  const feed=[];let ti=0,mi=0,si=0;
  for(let i=0;i<30;i++){
    if(i%3===2&&mi<MKT_NEWS.length){feed.push({time:TIMES[ti++],src:MKT_NEWS[mi][1],text:MKT_NEWS[mi][0],sym:null});mi++}
    else if(si<hot.length){const st=hot[si++];feed.push({time:TIMES[ti++],src:st.news[0].src,text:st.news[0].text,sym:st.sym})}
    else if(mi<MKT_NEWS.length){feed.push({time:TIMES[ti++],src:MKT_NEWS[mi][1],text:MKT_NEWS[mi][0],sym:null});mi++}
  }
  const sectors=[...new Set(stocks.map(s=>s.sector))].sort((a,b)=>a.localeCompare(b,"tr"));
  return {stocks,feed,sectors};
}
