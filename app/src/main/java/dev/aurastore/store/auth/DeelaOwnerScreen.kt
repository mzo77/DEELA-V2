package dev.aurastore.store.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.aurastore.store.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder

private data class OwnerMember(val id:String,val email:String,val role:String,val active:Boolean,val suspended:Boolean,val endsAt:String)
private data class OwnerRequest(val id:String,val email:String,val months:Int,val platform:String)
private data class OwnerData(val members:List<OwnerMember>,val audit:List<String>,val email:String,val requests:List<OwnerRequest>)
private data class OwnerCatalogEntry(
    val key:String,val title:String,val kind:String,val category:String,
    val hidden:Boolean,val featured:Boolean=false
)
private data class OwnerCatalogPage(val apps:List<OwnerCatalogEntry>,val hasMore:Boolean)

private data class OwnerServiceObservation(val status:String,val receivedAt:String?,val fresh:Boolean)

private data class OwnerBookListing(
    val id:String,val title:String,val author:String,val status:String,val format:String,val sellerName:String
)
private data class OwnerBookShop(val id:String,val name:String,val status:String,val city:String)

private object OwnerApi {
    suspend fun serviceObservations(token:String):Map<String,OwnerServiceObservation> = withContext(Dispatchers.IO) {
        val request=Request.Builder().url(base+"/api/owner/service-observations")
            .header("Authorization","Bearer "+token).header("Cache-Control","no-cache").get().build()
        client.newBuilder().callTimeout(10,java.util.concurrent.TimeUnit.SECONDS)
            .followRedirects(false).followSslRedirects(false).build().newCall(request).execute().use { response ->
            if(!response.isSuccessful) error("تعذر قراءة تقارير الحالة")
            val payload=JSONObject(response.body.string())
            check(payload.optString("source")=="owner_reported")
            val items=payload.getJSONArray("observations")
            (0 until items.length()).associate { i ->
                val item=items.getJSONObject(i)
                item.getString("service_name") to OwnerServiceObservation(
                    item.optString("reported_status","unknown"),
                    if(item.isNull("received_at")) null else item.optString("received_at").takeIf { it.isNotBlank() },
                    item.optBoolean("fresh",false)
                )
            }
        }
    }
    private const val IOS_BASE="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-ios-web"
    private fun encode(value:String)=URLEncoder.encode(value,"UTF-8")
    suspend fun catalog(token:String,platform:String,query:String,offset:Int,limit:Int=40):OwnerCatalogPage=withContext(Dispatchers.IO){
        val url=if(platform=="ios") IOS_BASE+"/api/source?id=0&page="+(offset/limit+1)+"&limit="+limit+"&q="+encode(query)
                else base+"/api/owner/android-catalog?offset="+offset+"&limit="+limit+"&q="+encode(query)
        val request=Request.Builder().url(url).header("Authorization","Bearer "+token).build()
        client.newCall(request).execute().use { response ->
            if(!response.isSuccessful)error("تعذر تحميل تطبيقات "+platform+": "+response.code)
            val payload=JSONObject(response.body.string())
            val list=payload.optJSONArray("apps")?:JSONArray()
            val apps=(0 until list.length()).map { i ->
                val v=list.getJSONObject(i)
                OwnerCatalogEntry(
                    key=v.optString("catalog_key"),
                    title=v.optString("title").ifBlank{ "تطبيق" },
                    kind=v.optString("kind",if(platform=="ios")"ios" else "app"),
                    category=v.optString("category","تطبيقات"),
                    hidden=v.optBoolean("is_hidden"),
                    featured=v.optBoolean("is_featured")
                )
            }.filter { it.key.isNotBlank() }
            OwnerCatalogPage(apps,payload.optBoolean("has_more",false))
        }
    }
    suspend fun setCatalogHidden(token:String,platform:String,app:OwnerCatalogEntry,hidden:Boolean)=withContext(Dispatchers.IO){
        val url=if(platform=="ios") IOS_BASE+"/api/owner/catalog-rules" else base+"/api/owner/android-catalog"
        val payload=JSONObject().put("catalog_key",app.key).put("is_hidden",hidden)
        if(platform=="ios")payload.put("is_featured",app.featured)
        val request=Request.Builder().url(url).header("Authorization","Bearer "+token)
            .post(payload.toString().toRequestBody("application/json".toMediaType())).build()
        client.newCall(request).execute().use { response ->
            if(!response.isSuccessful)error("تعذر تعديل ظهور التطبيق: "+response.code)
        }
    }

    private const val BOOKS_BASE="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-books"
    private suspend fun booksRequest(token:String,path:String,body:JSONObject?=null):JSONObject=withContext(Dispatchers.IO){
        val builder=Request.Builder().url(BOOKS_BASE+path).header("Authorization","Bearer "+token).header("Cache-Control","no-cache")
        if(body!=null)builder.post(body.toString().toRequestBody("application/json".toMediaType())) else builder.get()
        client.newCall(builder.build()).execute().use { response ->
            val raw=response.body?.string().orEmpty()
            if(!response.isSuccessful) {
                val message=runCatching{JSONObject(raw).optString("error")}.getOrNull().orEmpty()
                error(message.ifBlank{"تعذر تنفيذ العملية: "+response.code})
            }
            JSONObject(raw)
        }
    }
    suspend fun bookListings(token:String):List<OwnerBookListing>{
        val rows=booksRequest(token,"/owner/listings").optJSONArray("listings")?:JSONArray()
        return (0 until rows.length()).map { i ->
            val item=rows.getJSONObject(i)
            val seller=item.optJSONObject("deela_books_sellers")
            OwnerBookListing(item.optString("id"),item.optString("title","كتاب"),item.optString("author"),
                item.optString("status"),item.optString("format"),seller?.optString("shop_name").orEmpty())
        }
    }
    suspend fun bookShops(token:String):List<OwnerBookShop>{
        val rows=booksRequest(token,"/owner/sellers").optJSONArray("sellers")?:JSONArray()
        return (0 until rows.length()).map { i ->
            val item=rows.getJSONObject(i)
            OwnerBookShop(item.optString("id"),item.optString("shop_name","متجر"),item.optString("status"),item.optString("city"))
        }
    }
    suspend fun setBookStatus(token:String,id:String,status:String){
        booksRequest(token,"/owner/listing-status",JSONObject().put("id",id).put("status",status))
    }
    suspend fun setShopStatus(token:String,id:String,status:String){
        booksRequest(token,"/owner/seller-status",JSONObject().put("id",id).put("status",status))
    }
    suspend fun bookReaderUrl(token:String,id:String):String{
        return booksRequest(token,"/download?id="+URLEncoder.encode(id,"UTF-8")).optString("url").also {
            if(!it.startsWith("https://"))error("لم يصل رابط قراءة آمن")
        }
    }

    private val client=OkHttpClient()
    private val base get()=BuildConfig.DEELA_API_BASE_URL.trimEnd('/')
    suspend fun checkOwnerConnection(token:String):Boolean=withContext(Dispatchers.IO) {
        val request=Request.Builder().url(base+"/api/owner/connection-status")
            .header("Authorization","Bearer "+token).header("Cache-Control","no-cache").get().build()
        client.newBuilder()
            .callTimeout(10,java.util.concurrent.TimeUnit.SECONDS)
            .followRedirects(false).followSslRedirects(false)
            .build().newCall(request).execute().use { response ->
                response.isSuccessful && response.body?.string()?.let {
                    JSONObject(it).optBoolean("ok",false)
                }==true
            }
    }
    suspend fun dashboard(token:String):OwnerData=withContext(Dispatchers.IO) {
        val request=Request.Builder().url(base+"/api/owner/dashboard").header("Authorization","Bearer "+token).build()
        client.newCall(request).execute().use { response ->
            if(!response.isSuccessful) error("تعذر تحميل بيانات الإدارة: "+response.code)
            val body=JSONObject(response.body.string())
            val members=body.optJSONArray("members")?:JSONArray()
            val audit=body.optJSONArray("audit")?:JSONArray()
            val requests=body.optJSONArray("requests")?:JSONArray()
            OwnerData(
                (0 until members.length()).map { i ->
                    val m=members.getJSONObject(i)
                    OwnerMember(m.optString("id"),m.optString("email"),m.optString("role"),m.optBoolean("active"),m.optBoolean("suspended"),m.optString("ends_at").takeUnless { it=="null" }?:"")
                },
                (0 until audit.length()).map { i -> val a=audit.getJSONObject(i);a.optString("action")+" — "+a.optString("created_at").take(16) },
                body.optJSONObject("owner")?.optString("email")?:"",
                (0 until requests.length()).map { i -> val r=requests.getJSONObject(i);OwnerRequest(r.optString("id"),r.optString("email"),r.optInt("months"),r.optString("platform")) }
            )
        }
    }
    suspend fun subscription(token:String,id:String,action:String,months:Int)=withContext(Dispatchers.IO) {
        val payload=JSONObject().put("user_id",id).put("action",action).put("months",months)
        val request=Request.Builder().url(base+"/api/owner/subscription")
            .header("Authorization","Bearer "+token)
            .post(payload.toString().toRequestBody("application/json".toMediaType())).build()
        client.newCall(request).execute().use { response ->
            if(!response.isSuccessful) error("تعذر تعديل الاشتراك: "+response.code)
        }
    }
    suspend fun review(token:String,id:String,decision:String)=withContext(Dispatchers.IO) {
        val payload=JSONObject().put("id",id).put("decision",decision)
        val request=Request.Builder().url(base+"/api/owner/requests/review")
            .header("Authorization","Bearer "+token)
            .post(payload.toString().toRequestBody("application/json".toMediaType())).build()
        client.newCall(request).execute().use { response ->
            if(!response.isSuccessful) error("تعذر مراجعة الطلب: "+response.code)
        }
    }
}
@Composable
fun DeelaOwnerScreen(session:DeelaSession,onLogout:()->Unit) {
    val scope=rememberCoroutineScope()
    var page by remember { mutableStateOf("الرئيسية") }
    var connectionStatus by remember(session.token) { mutableStateOf<Boolean?>(null) }
    var checkedAt by remember(session.token) { mutableStateOf<Long?>(null) }
    var observations by remember(session.token) { mutableStateOf<Map<String,OwnerServiceObservation>>(emptyMap()) }
    var reportsAvailable by remember(session.token) { mutableStateOf<Boolean?>(null) }
    LaunchedEffect(page,session.token) {
        if(page=="حالة الاتصال") {
            connectionStatus=null
            checkedAt=null
            observations=emptyMap()
            reportsAvailable=null
            while(true) {
                connectionStatus=try {
                    OwnerApi.checkOwnerConnection(session.token)
                } catch(e:CancellationException) { throw e }
                  catch(e:Exception) { false }
                try {
                    observations=OwnerApi.serviceObservations(session.token)
                    reportsAvailable=true
                } catch(e:CancellationException) { throw e }
                  catch(e:Exception) {
                      observations=emptyMap()
                      reportsAvailable=false
                  }
                checkedAt=System.currentTimeMillis()
                delay(30_000)
            }
        }
    }
    var selectedPlatform by remember { mutableStateOf("android") }
    var catalogQuery by remember { mutableStateOf("") }
    var catalogOffset by remember { mutableIntStateOf(0) }
    var catalogReload by remember { mutableIntStateOf(0) }
    var catalogItems by remember { mutableStateOf<List<OwnerCatalogEntry>>(emptyList()) }
    var catalogHasMore by remember { mutableStateOf(false) }
    var catalogBusy by remember { mutableStateOf(false) }
    var catalogError by remember { mutableStateOf<String?>(null) }
    var data by remember { mutableStateOf<OwnerData?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var pending by remember { mutableStateOf<Pair<OwnerMember,String>?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var selectedMonths by remember { mutableIntStateOf(1) }
    var requestReview by remember { mutableStateOf<Pair<OwnerRequest,String>?>(null) }
    var booksMode by remember { mutableStateOf("الكتب") }
    var booksReload by remember { mutableIntStateOf(0) }
    var bookListings by remember { mutableStateOf<List<OwnerBookListing>>(emptyList()) }
    var bookShops by remember { mutableStateOf<List<OwnerBookShop>>(emptyList()) }
    var booksBusy by remember { mutableStateOf(false) }
    var booksError by remember { mutableStateOf<String?>(null) }
    val uriHandler=androidx.compose.ui.platform.LocalUriHandler.current
    LaunchedEffect(page,selectedPlatform,catalogQuery,catalogOffset,catalogReload,session.token) {
        if(page=="التطبيقات") {
            catalogBusy=true
            try {
                val result=OwnerApi.catalog(session.token,selectedPlatform,catalogQuery,catalogOffset)
                catalogItems=if(catalogOffset==0)result.apps else (catalogItems+result.apps).distinctBy { it.key }
                catalogHasMore=result.hasMore
                catalogError=null
            }catch(e:Exception){catalogError=e.message?:"تعذر تحميل التطبيقات"}
            finally {catalogBusy=false}
        }
    }
    LaunchedEffect(page,booksMode,booksReload,session.token) {
        if(page=="كتب DEELA") {
            booksBusy=true
            try {
                if(booksMode=="الكتب") bookListings=OwnerApi.bookListings(session.token)
                else bookShops=OwnerApi.bookShops(session.token)
                booksError=null
            } catch(e:CancellationException) { throw e }
              catch(e:Exception) { booksError=e.message?:"تعذر تحميل إدارة الكتب" }
            finally { booksBusy=false }
        }
    }
    LaunchedEffect(session.token,reload) {
        busy=true
        try { data=OwnerApi.dashboard(session.token);error=null }
        catch(e:Exception) { error=e.message?:"تعذر الاتصال" }
        finally { busy=false }
    }
    requestReview?.let { (request,decision) ->
        AlertDialog(onDismissRequest={requestReview=null},title={Text("مراجعة طلب الاشتراك")},
            text={Text(request.email+" — "+request.months+" شهر — "+request.platform)},
            confirmButton={TextButton(onClick={
                requestReview=null;busy=true
                scope.launch {
                    try {OwnerApi.review(session.token,request.id,decision);reload++}
                    catch(e:Exception){error=e.message?:"تعذر مراجعة الطلب"}
                    finally{busy=false}
                }
            }){Text(if(decision=="approved")"تفعيل" else "رفض")}},
            dismissButton={TextButton(onClick={requestReview=null}){Text("إلغاء")}})
    }
    pending?.let { (member,action) ->
        AlertDialog(
            onDismissRequest={ pending=null },
            title={ Text("تأكيد تعديل الاشتراك") },
            text={ Text("الحساب: "+member.email+"\nالإجراء: "+actionLabel(action)) },
            confirmButton={ TextButton(onClick={
                pending=null;busy=true
                scope.launch {
                    try { OwnerApi.subscription(session.token,member.id,action,selectedMonths);reload++ }
                    catch(e:Exception) { error=e.message?:"فشل التعديل" }
                    finally { busy=false }
                }
            }) { Text("تأكيد") } },
            dismissButton={ TextButton(onClick={ pending=null }) { Text("إلغاء") } }
        )
    }
    Surface(Modifier.fillMaxSize(),color=MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxSize().padding(horizontal=18.dp)) {
            Spacer(Modifier.height(28.dp))
            Text("تطبيقات ديلا ❤️",style=MaterialTheme.typography.headlineMedium,color=MaterialTheme.colorScheme.primary)
            Text("لوحة تحكم المالك 👑",style=MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(12.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()),horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                listOf("الرئيسية","الطلبات","المشتركون","التطبيقات","كتب DEELA","السجل","حالة الاتصال").forEach { tab ->
                    FilterChip(selected=page==tab,onClick={page=tab},label={Text(tab)})
                }
            }
            if(busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let {
                Text(it,color=MaterialTheme.colorScheme.error)
                TextButton(onClick={reload++}) {Text("إعادة المحاولة")}
            }
            val current=data
            if(page=="حالة الاتصال") {
                Column(verticalArrangement=Arrangement.spacedBy(8.dp)) {
                    Text("مراقبة إدارة المالك",style=MaterialTheme.typography.titleMedium)
                    Text(when(connectionStatus) {
                        true -> "واجهة إدارة المالك تستجيب للحساب الحالي"
                        false -> "تعذر التحقق من الاتصال أو الصلاحية"
                        null -> "جارٍ التحقق"
                    })
                    checkedAt?.let { stamp ->
                        Text("آخر فحص: "+java.text.DateFormat.getDateTimeInstance().format(java.util.Date(stamp)))
                    }
                    Text("يتكرر الفحص كل 30 ثانية أثناء عرض هذه الصفحة.",style=MaterialTheme.typography.bodySmall)
                    HorizontalDivider()
                    listOf("hexstrike" to "HexStrike AI","pentestgpt" to "PentestGPT","pentagi" to "PentAGI","pentest-swarm" to "Pentest Swarm").forEach { (key,engine) ->
                        val report=observations[key]
                        Text(engine,style=MaterialTheme.typography.titleSmall)
                        Text(when {
                            reportsAvailable==false -> "تعذر قراءة التقرير"
                            reportsAvailable==null -> "جارٍ قراءة التقارير"
                            report?.receivedAt==null -> "لم يصل تقرير"
                            !report.fresh -> "التقرير قديم — الحالة الحالية غير مؤكدة"
                            report.status=="responding" -> "آخر تقرير: يستجيب"
                            report.status=="not_responding" -> "آخر تقرير: لا يستجيب"
                            else -> "آخر تقرير: الحالة غير معروفة"
                        },style=MaterialTheme.typography.bodySmall)
                        report?.receivedAt?.let { Text("وقت الاستلام: "+it,style=MaterialTheme.typography.bodySmall) }
                    }
                    Text("التقارير مرسلة من المالك ولا تثبت التشغيل المستمر بشكل مستقل.",style=MaterialTheme.typography.bodySmall)
                }
            } else if(current!=null) {
                when(page) {
                    "الرئيسية" -> {
                        val subscribers=current.members.filter {it.role!="owner"}
                        Text("حساب المالك: "+current.email,style=MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(16.dp))
                        Text("إجمالي المشتركين: "+subscribers.size,style=MaterialTheme.typography.titleMedium)
                        Text("الاشتراكات النشطة: "+subscribers.count {it.active})
                        Text("طلبات الاشتراك المعلقة: "+current.requests.size)
                        Button(onClick={page="الطلبات"}) {Text("مراجعة طلبات الاشتراك") }
                        Text("غير النشطة: "+subscribers.count {!it.active})
                        Spacer(Modifier.height(16.dp))
                        Button(onClick={page="المشتركون"}) {Text("إدارة المشتركين والاشتراكات")}
                        OutlinedButton(onClick={reload++}) {Text("تحديث البيانات")}
                        HorizontalDivider()
                        Text("قوة غاشمة ⚡",style=MaterialTheme.typography.titleMedium)
                        Text("الأدوات المتقدمة لم تُنقل بعد.")
                        OutlinedButton(onClick={page="حالة الاتصال"}) {Text("مراقبة الاتصال")}
                    }
                    "الطلبات" -> {
                        LazyColumn(modifier=Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(10.dp)) {
                            items(current.requests,key={it.id}) { request ->
                                ElevatedCard(Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(12.dp)) {
                                        Text(request.email,style=MaterialTheme.typography.titleSmall)
                                        Text("المدة: "+request.months+" شهر — "+request.platform)
                                        Row {
                                            TextButton(enabled=!busy,onClick={requestReview=request to "approved"}){Text("موافقة وتفعيل")}
                                            TextButton(enabled=!busy,onClick={requestReview=request to "rejected"}){Text("رفض")}
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "المشتركون" -> {
                        Row(horizontalArrangement=Arrangement.spacedBy(5.dp)) {
                            listOf(1,2,3,6,12).forEach { m ->
                                FilterChip(selected=selectedMonths==m,onClick={selectedMonths=m},label={Text(if(m==12)"سنة" else "$m ش")})
                            }
                        }
                        LazyColumn(verticalArrangement=Arrangement.spacedBy(10.dp),modifier=Modifier.weight(1f)) {
                            items(current.members.filter {it.role!="owner"},key={it.id}) {member->
                                ElevatedCard(Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(6.dp)) {
                                        Text(member.email.ifBlank {member.id},style=MaterialTheme.typography.titleSmall)
                                        Text(if(member.active) "اشتراك نشط" else if(member.suspended) "اشتراك موقوف" else "لا يوجد اشتراك نشط")
                                        if(member.endsAt.isNotBlank()) Text("ينتهي: "+member.endsAt.take(10),style=MaterialTheme.typography.bodySmall)
                                        Row(horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                                            TextButton(enabled=!busy,onClick={pending=member to "trial"}) {Text("تجربة 24 ساعة")}
                                            TextButton(enabled=!busy,onClick={pending=member to "renew"}) {Text("تجديد "+(if(selectedMonths==12)"سنة" else "$selectedMonths شهر"))}
                                        }
                                        Row(horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                                            TextButton(enabled=!busy&&member.active,onClick={pending=member to "suspend"}) {Text("إيقاف")}
                                            TextButton(enabled=!busy&&member.suspended,onClick={pending=member to "resume"}) {Text("استئناف")}
                                            TextButton(enabled=!busy,onClick={pending=member to "revoke"}) {Text("إلغاء")}
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "التطبيقات" -> {
                        Text("المتجر الرسمي — تحكم المالك",style=MaterialTheme.typography.titleMedium)
                        Text("إخفاء أي تطبيق يمنع ظهوره للمشتركين، دون حذف ملفاته.",style=MaterialTheme.typography.bodySmall)
                        Row(horizontalArrangement=Arrangement.spacedBy(7.dp)) {
                            listOf("android" to "أندرويد","ios" to "آيفون").forEach { (platform,label) ->
                                FilterChip(selected=selectedPlatform==platform,onClick={
                                    selectedPlatform=platform;catalogQuery="";catalogOffset=0;catalogItems=emptyList()
                                },label={Text(label)})
                            }
                        }
                        OutlinedTextField(
                            value=catalogQuery,
                            onValueChange={ catalogQuery=it;catalogOffset=0;catalogItems=emptyList() },
                            label={Text("البحث باسم التطبيق أو معرفه")},
                            singleLine=true,modifier=Modifier.fillMaxWidth()
                        )
                        if(catalogBusy) LinearProgressIndicator(Modifier.fillMaxWidth())
                        catalogError?.let {Text(it,color=MaterialTheme.colorScheme.error)}
                        LazyColumn(modifier=Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(9.dp)) {
                            items(catalogItems,key={it.key}) { app ->
                                ElevatedCard(Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(7.dp)) {
                                        Text(app.title,style=MaterialTheme.typography.titleSmall)
                                        Text(app.category+" · "+if(app.hidden)"مخفي عن المشتركين" else "ظاهر للمشتركين",
                                            style=MaterialTheme.typography.bodySmall)
                                        TextButton(enabled=!catalogBusy,onClick={
                                            catalogBusy=true
                                            scope.launch{
                                                try{
                                                    OwnerApi.setCatalogHidden(session.token,selectedPlatform,app,!app.hidden)
                                                    catalogOffset=0;catalogReload++
                                                }catch(e:Exception){catalogError=e.message?:"فشل حفظ الإخفاء"}
                                                finally{catalogBusy=false}
                                            }
                                        }) {Text(if(app.hidden)"إظهار التطبيق" else "إخفاء التطبيق")}
                                    }
                                }
                            }
                            if(catalogHasMore) item {
                                OutlinedButton(enabled=!catalogBusy,onClick={catalogOffset+=40},modifier=Modifier.fillMaxWidth()){
                                    Text("المزيد من التطبيقات")
                                }
                            }
                        }
                    }
                    "كتب DEELA" -> {
                        Text("إدارة متجر الكتب والروايات",style=MaterialTheme.typography.titleMedium)
                        Text("اعتماد المتاجر والكتب، وفتح الكتاب لمراجعته قبل النشر.",style=MaterialTheme.typography.bodySmall)
                        Row(horizontalArrangement=Arrangement.spacedBy(7.dp)) {
                            listOf("الكتب","المتاجر").forEach { mode ->
                                FilterChip(selected=booksMode==mode,onClick={booksMode=mode},label={Text(mode)})
                            }
                            TextButton(enabled=!booksBusy,onClick={booksReload++}){Text("تحديث")}
                        }
                        if(booksBusy) LinearProgressIndicator(Modifier.fillMaxWidth())
                        booksError?.let { Text(it,color=MaterialTheme.colorScheme.error) }
                        if(booksMode=="الكتب") {
                            val visible=bookListings.filter { it.status!="archived" }
                            if(visible.isEmpty()&&!booksBusy&&booksError==null) Text("لا توجد كتب مسجلة حاليًا.")
                            LazyColumn(modifier=Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(9.dp)) {
                                items(visible,key={it.id}) { book ->
                                    ElevatedCard(Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(5.dp)) {
                                            Text(book.title,style=MaterialTheme.typography.titleSmall)
                                            Text((book.author.ifBlank{"مؤلف غير محدد"})+" · "+(book.sellerName.ifBlank{"متجر DEELA"}))
                                            Text("الحالة: "+book.status+" · "+book.format,style=MaterialTheme.typography.bodySmall)
                                            Row(horizontalArrangement=Arrangement.spacedBy(5.dp)) {
                                                TextButton(enabled=!booksBusy,onClick={
                                                    booksBusy=true
                                                    scope.launch {
                                                        try { uriHandler.openUri(OwnerApi.bookReaderUrl(session.token,book.id)) }
                                                        catch(e:Exception) { booksError=e.message?:"تعذر فتح الكتاب" }
                                                        finally { booksBusy=false }
                                                    }
                                                }){Text("فتح للمعاينة")}
                                                if(book.status=="pending"||book.status=="draft") {
                                                    TextButton(enabled=!booksBusy,onClick={
                                                        booksBusy=true
                                                        scope.launch {
                                                            try { OwnerApi.setBookStatus(session.token,book.id,"published");booksReload++ }
                                                            catch(e:Exception){booksError=e.message?:"تعذر اعتماد الكتاب"}
                                                            finally{booksBusy=false}
                                                        }
                                                    }){Text("اعتماد ونشر")}
                                                    TextButton(enabled=!booksBusy,onClick={
                                                        booksBusy=true
                                                        scope.launch {
                                                            try { OwnerApi.setBookStatus(session.token,book.id,"rejected");booksReload++ }
                                                            catch(e:Exception){booksError=e.message?:"تعذر رفض الكتاب"}
                                                            finally{booksBusy=false}
                                                        }
                                                    }){Text("رفض")}
                                                } else if(book.status=="published") {
                                                    TextButton(enabled=!booksBusy,onClick={
                                                        booksBusy=true
                                                        scope.launch {
                                                            try { OwnerApi.setBookStatus(session.token,book.id,"archived");booksReload++ }
                                                            catch(e:Exception){booksError=e.message?:"تعذر إخفاء الكتاب"}
                                                            finally{booksBusy=false}
                                                        }
                                                    }){Text("إخفاء")}
                                                } else if(book.status=="archived") {
                                                    TextButton(enabled=!booksBusy,onClick={
                                                        booksBusy=true
                                                        scope.launch {
                                                            try { OwnerApi.setBookStatus(session.token,book.id,"published");booksReload++ }
                                                            catch(e:Exception){booksError=e.message?:"تعذر إعادة النشر"}
                                                            finally{booksBusy=false}
                                                        }
                                                    }){Text("إعادة النشر")}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            val visible=bookShops.filter { it.status!="rejected" }
                            if(visible.isEmpty()&&!booksBusy&&booksError==null) Text("لا توجد متاجر مسجلة حاليًا.")
                            LazyColumn(modifier=Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(9.dp)) {
                                items(visible,key={it.id}) { shop ->
                                    ElevatedCard(Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(5.dp)) {
                                            Text(shop.name,style=MaterialTheme.typography.titleSmall)
                                            Text((shop.city.ifBlank{"الموقع غير محدد"})+" · الحالة: "+shop.status,style=MaterialTheme.typography.bodySmall)
                                            Row(horizontalArrangement=Arrangement.spacedBy(5.dp)) {
                                                if(shop.status!="approved") TextButton(enabled=!booksBusy,onClick={
                                                    booksBusy=true
                                                    scope.launch {
                                                        try { OwnerApi.setShopStatus(session.token,shop.id,"approved");booksReload++ }
                                                        catch(e:Exception){booksError=e.message?:"تعذر اعتماد المتجر"}
                                                        finally{booksBusy=false}
                                                    }
                                                }){Text("اعتماد")}
                                                if(shop.status=="pending") TextButton(enabled=!booksBusy,onClick={
                                                    booksBusy=true
                                                    scope.launch {
                                                        try { OwnerApi.setShopStatus(session.token,shop.id,"rejected");booksReload++ }
                                                        catch(e:Exception){booksError=e.message?:"تعذر رفض المتجر"}
                                                        finally{booksBusy=false}
                                                    }
                                                }){Text("رفض")}
                                                if(shop.status=="approved") TextButton(enabled=!booksBusy,onClick={
                                                    booksBusy=true
                                                    scope.launch {
                                                        try { OwnerApi.setShopStatus(session.token,shop.id,"suspended");booksReload++ }
                                                        catch(e:Exception){booksError=e.message?:"تعذر إيقاف المتجر"}
                                                        finally{booksBusy=false}
                                                    }
                                                }){Text("إيقاف")}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "السجل" -> LazyColumn(modifier=Modifier.weight(1f)) {
                        items(current.audit) {event->
                            Text(event,modifier=Modifier.padding(vertical=8.dp))
                            HorizontalDivider()
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick=onLogout,modifier=Modifier.fillMaxWidth()) {Text("تسجيل الخروج")}
            Spacer(Modifier.height(16.dp))
        }
    }
}
private fun actionLabel(action:String)=when(action) {
    "trial"->"تجربة 24 ساعة"
    "renew"->"تجديد 30 يومًا"
    "suspend"->"إيقاف الاشتراك"
    "resume"->"استئناف الاشتراك"
    "revoke"->"إلغاء الاشتراك"
    else->action
}
