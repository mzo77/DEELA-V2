package dev.aurastore.store.auth

import androidx.compose.foundation.layout.*
import android.content.Intent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
private data class OwnerRequest(val id:String,val userId:String,val email:String,val months:Int,val platform:String)
private data class OwnerData(val members:List<OwnerMember>,val audit:List<String>,val email:String,val requests:List<OwnerRequest>)
private data class OwnerCatalogEntry(
    val key:String,val title:String,val kind:String,val category:String,
    val hidden:Boolean,val featured:Boolean=false
)
private data class OwnerCatalogPage(val apps:List<OwnerCatalogEntry>,val hasMore:Boolean)

private object OwnerApi {
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

    private val client=OkHttpClient()
    private val base get()=BuildConfig.DEELA_API_BASE_URL.trimEnd('/')
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
                (0 until requests.length()).map { i -> val r=requests.getJSONObject(i);OwnerRequest(r.optString("id"),r.optString("user_id"),r.optString("email"),r.optInt("months"),r.optString("platform")) }
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
    suspend fun review(token:String,id:String,decision:String):String?=withContext(Dispatchers.IO) {
        val payload=JSONObject().put("id",id).put("decision",decision)
        val request=Request.Builder().url(base+"/api/owner/requests/review")
            .header("Authorization","Bearer "+token)
            .post(payload.toString().toRequestBody("application/json".toMediaType())).build()
        client.newCall(request).execute().use { response ->
            if(!response.isSuccessful) error("تعذر مراجعة الطلب: "+response.code)
            val emailStatus=JSONObject(response.body.string()).optString("email_status")
            emailStatus.takeIf {it.isNotBlank()&&it!="null"}
        }
    }
}
@Composable
fun DeelaOwnerScreen(session:DeelaSession,onLogout:()->Unit) {
    val activityContext=LocalContext.current
    val openCommerce:(String)->Unit = { page ->
        activityContext.startActivity(
            Intent(activityContext,DeelaShopOwnerActivity::class.java)
                .putExtra(DeelaShopOwnerActivity.EXTRA_TOKEN,session.token)
                .putExtra(DeelaShopOwnerActivity.EXTRA_PAGE,page)
        )
    }
    val openBooks = {
        activityContext.startActivity(
            Intent(activityContext,DeelaBooksOwnerActivity::class.java)
                .putExtra(DeelaBooksOwnerActivity.EXTRA_TOKEN,session.token)
        )
    }
    val scope=rememberCoroutineScope()
    var page by remember { mutableStateOf("الرئيسية") }
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
    var mailNotice by remember { mutableStateOf<String?>(null) }
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
    LaunchedEffect(session.token,reload,page) {
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
                    try {
                        val status=OwnerApi.review(session.token,request.id,decision)
                        mailNotice=when {
                            decision=="rejected" -> "تم رفض الطلب."
                            status=="sent" -> "تم تفعيل الاشتراك، وقبلت خدمة البريد رسالة التأكيد."
                            status=="unconfigured" -> "تم تفعيل الاشتراك بنجاح، لكن خدمة البريد تحتاج إلى إعداد. يمكنك مراجعة تبويب الرسائل."
                            status=="failed" || status=="pending" -> "تم تفعيل الاشتراك، وتعذر إرسال رسالة البريد حاليًا. يمكن إعادة المحاولة من تبويب الرسائل."
                            else -> "تم تفعيل الاشتراك، ويمكنك مراجعة حالة البريد من تبويب الرسائل."
                        }
                        reload++
                    }
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
    // The owner UI has a quiet navy/teal palette, separate from subscriber pages.
    val rose = Color(0xFF85DCD8)
    val ownerScheme = darkColorScheme(
        primary = rose,
        onPrimary = Color(0xFF0B2330),
        secondary = Color(0xFFACC6F4),
        onSecondary = Color(0xFF15243E),
        tertiary = Color(0xFF96CDBA),
        background = Color(0xFF0D1728),
        surface = Color(0xFF18293E),
        surfaceVariant = Color(0xFF263B51),
        onSurface = Color(0xFFEBF5FF),
        onSurfaceVariant = Color(0xFFBCD3E2),
        outline = Color(0xFF5A788B),
        error = Color(0xFFE1BE90),
    )
    MaterialTheme(colorScheme = ownerScheme) {
        Column(
            modifier = Modifier.fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color(0xFF162B3E), Color(0xFF0D1728))))
                .padding(horizontal = 16.dp),
        ) {
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("تطبيقات ديلا ❤️", style = MaterialTheme.typography.headlineMedium,
                        color = rose)
                    Text("لوحة تحكم المالك 👑", style = MaterialTheme.typography.titleMedium,
                        color = Color(0xFFF4E4EF))
                }
                OutlinedButton(enabled = !busy, onClick = { reload++ }) { Text("↻ تحديث") }
            }
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                listOf("الرئيسية", "المتجر الإلكتروني", "ديلا بوكس 📚", "الطلبات", "المشتركون", "التطبيقات", "شهادات Apple", "التحديثات", "القوة الغاشمة ⚡", "مركز الذكاء 🤖", "مختبر الأمان 🛡️", "الرسائل", "السجل").forEach { tab ->
                    FilterChip(
                        selected = page == tab,
                        onClick = { page = tab },
                        label = { Text(tab) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF24566A),
                            selectedLabelColor = Color.White,
                            containerColor = Color(0xFF152A3D),
                        ),
                    )
                }
            }
            Spacer(Modifier.height(9.dp))
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth(), color = rose)
            mailNotice?.let {
                ElevatedCard(Modifier.fillMaxWidth()) {
                    Text(it, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.bodySmall)
                }
            }
            error?.let { failure ->
                Text(failure, color = MaterialTheme.colorScheme.error)
                TextButton(onClick = { reload++ }) { Text("إعادة المحاولة") }
            }
            val current = data
            if (current == null) {
                Box(Modifier.weight(1f)) {
                    Text("جارٍ تحميل بيانات لوحة المالك...", modifier = Modifier.padding(top = 24.dp))
                }
            } else {
                when (page) {
                    "ديلا بوكس 📚" -> {
                        Column(
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(13.dp)
                        ) {
                            Text("DEELA Books — منصة الكتب والروايات",style=MaterialTheme.typography.titleLarge)
                            Text("موقع مستقل داخل تطبيق ديلا الرسمي. سوق كتب جديد ومستعمل ورقمي، نشر المؤلفين، إدارة المتاجر، الطلبات والمراجعات.",
                                color=MaterialTheme.colorScheme.onSurfaceVariant,
                                style=MaterialTheme.typography.bodyMedium)
                            Button(onClick=openBooks,modifier=Modifier.fillMaxWidth()) {
                                Text("فتح DEELA Books ولوحة إدارتها")
                            }
                            ElevatedCard(
                                modifier=Modifier.fillMaxWidth(),
                                colors=CardDefaults.elevatedCardColors(containerColor=Color(0xFF1A3546))
                            ) {
                                Text("🔒 الموقع خاص بحساب المالك حتى الإطلاق. لا يتم تحصيل دفع أو تشغيل شحن آلي قبل ربط مزودي الخدمة.",
                                    modifier=Modifier.padding(17.dp),
                                    style=MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                    "المتجر الإلكتروني" -> {
                        Column(
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(13.dp)
                        ) {
                            Text("متجر ديلا الإلكتروني الرسمي", style=MaterialTheme.typography.titleLarge)
                            Text("الواجهة متصلة بقاعدة بيانات DEELA نفسها. صفحة الويب محمية بحساب المالك حاليًا.",
                                color=MaterialTheme.colorScheme.onSurfaceVariant,
                                style=MaterialTheme.typography.bodyMedium)
                            Button(
                                onClick={openCommerce("shop")},
                                modifier=Modifier.fillMaxWidth()
                            ) {Text("فتح المتجر الإلكتروني")}
                            OutlinedButton(
                                onClick={openCommerce("admin")},
                                modifier=Modifier.fillMaxWidth()
                            ) {Text("فتح إدارة المنتجات والطلبات")}
                            ElevatedCard(
                                modifier=Modifier.fillMaxWidth(),
                                colors=CardDefaults.elevatedCardColors(containerColor=Color(0xFF1A3546))
                            ) {
                                Text("إضافة المنتجات والأسعار والصور والعروض، ومراجعة الطلبات وتفعيل العضويات من حساب المالك دون تحويل المشتركين إلى تطبيق آخر.",
                                    modifier=Modifier.padding(17.dp),
                                    style=MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                    "الرئيسية" -> {
                        val subscribers = current.members.filter { it.role != "owner" }
                        val active = subscribers.count { it.active && !it.suspended }
                        val awaitingReview = current.requests.map { it.userId }.toSet()
                        val inactive = subscribers.count { !it.active && it.id !in awaitingReview }
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(bottom = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            item {
                                ElevatedCard(
                                    colors = CardDefaults.elevatedCardColors(containerColor = Color(0xFF1B344A)),
                                    shape = RoundedCornerShape(22.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("مرحبًا بك في مركز التحكم 👋", style = MaterialTheme.typography.titleLarge)
                                        Text("تحكم في التطبيقات والمشتركين والتحديثات ومختبرات المشروع الأول.",
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text(current.email, style = MaterialTheme.typography.labelMedium, color = rose)
                                    }
                                }
                            }
                            item {
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OwnerStat("👥 إجمالي المشتركين", subscribers.size.toString(), rose, Modifier.weight(1f))
                                    OwnerStat("👑 اشتراكات نشطة", active.toString(), Color(0xFF9CD6B6), Modifier.weight(1f))
                                }
                            }
                            item {
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OwnerStat("📥 طلبات معلقة", current.requests.size.toString(), Color(0xFFF0BF8B), Modifier.weight(1f))
                                    OwnerStat("⏸ غير نشطة", inactive.toString(), Color(0xFFC7A9D5), Modifier.weight(1f))
                                }
                            }
                            item {
                                Text("إجراءات سريعة", style = MaterialTheme.typography.titleLarge)
                                Spacer(Modifier.height(9.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                                    OwnerQuick("📋 مراجعة الطلبات", Modifier.weight(1f)) { page = "الطلبات" }
                                    OwnerQuick("👥 إدارة المشتركين", Modifier.weight(1f)) { page = "المشتركون" }
                                }
                                Spacer(Modifier.height(9.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                                    OwnerQuick("🔄 تحديث المصادر", Modifier.weight(1f)) { page = "التحديثات" }
                                    OwnerQuick("✉️ رسائل التفعيل", Modifier.weight(1f)) { page = "الرسائل" }
                                }
                            }
                            item {
                                ElevatedCard(
                                    colors = CardDefaults.elevatedCardColors(containerColor = Color(0xFF291F2C)),
                                    shape = RoundedCornerShape(20.dp),
                                ) {
                                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("القوة الغاشمة ⚡", style = MaterialTheme.typography.titleLarge, color = rose)
                                        Text("المشروع الأول بكامل مختبراته: 16 أمرًا، البرمجة، تحليل الملفات، محرك البحث الشامل، GitHub ومركز الأمان، مع الذكاء الاصطناعي.",
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            style = MaterialTheme.typography.bodyMedium)
                                        Button(onClick = { page = "القوة الغاشمة ⚡" },
                                            modifier = Modifier.fillMaxWidth()) { Text("فتح أدوات القوة الغاشمة ⚡") }
                                    }
                                }
                            }
                        }
                    }
                    "الطلبات" -> {
                        Text("طلبات الاشتراك", style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(7.dp))
                        Text("قيد المراجعة: ${current.requests.size}", color = rose)
                        if (current.requests.isEmpty()) {
                            Box(Modifier.weight(1f)) {
                                Text("لا توجد طلبات معلقة حاليًا.", modifier = Modifier.padding(top = 22.dp))
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                                contentPadding = PaddingValues(vertical = 10.dp),
                            ) {
                                items(current.requests, key = { it.id }) { request ->
                                    ElevatedCard(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(18.dp),
                                        colors = CardDefaults.elevatedCardColors(containerColor = Color(0xFF2B222E)),
                                    ) {
                                        Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                            Text(request.email, style = MaterialTheme.typography.titleMedium)
                                            Text("المنصة: ${request.platform}  ·  المدة: ${request.months} شهر",
                                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                                Button(enabled = !busy, onClick = { requestReview = request to "approved" }) {
                                                    Text("✓ موافقة وتفعيل")
                                                }
                                                OutlinedButton(enabled = !busy, onClick = { requestReview = request to "rejected" }) {
                                                    Text("رفض")
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "المشتركون" -> {
                        Text("إدارة المشتركين", style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(8.dp))
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(1, 2, 3, 6, 12).forEach { months ->
                                FilterChip(selected = selectedMonths == months,
                                    onClick = { selectedMonths = months },
                                    label = { Text(if (months == 12) "سنة" else months.toString() + " شهر") })
                            }
                        }
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            contentPadding = PaddingValues(vertical = 10.dp),
                        ) {
                            items(current.members.filter { it.role != "owner" }, key = { it.id }) { member ->
                                ElevatedCard(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.elevatedCardColors(containerColor = Color(0xFF2B222E)),
                                ) {
                                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                        Text(member.email.ifBlank { member.id }, style = MaterialTheme.typography.titleMedium)
                                        Text(
                                            when {
                                                member.suspended -> "⏸ اشتراك موقوف"
                                                member.active -> "✅ اشتراك نشط"
                                                else -> "○ لا يوجد اشتراك نشط"
                                            }, color = if (member.active && !member.suspended) Color(0xFF9CD6B6)
                                                else MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        if (member.endsAt.isNotBlank()) Text("تاريخ الانتهاء: " + member.endsAt.take(10))
                                        Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                            TextButton(enabled = !busy, onClick = { pending = member to "trial" }) { Text("تجربة 24 ساعة") }
                                            TextButton(enabled = !busy, onClick = { pending = member to "renew" }) { Text("تجديد") }
                                        }
                                        Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                            TextButton(enabled = !busy && member.active, onClick = { pending = member to "suspend" }) { Text("إيقاف") }
                                            TextButton(enabled = !busy && member.suspended, onClick = { pending = member to "resume" }) { Text("استئناف") }
                                            TextButton(enabled = !busy, onClick = { pending = member to "revoke" }) { Text("إلغاء") }
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
                                        Text(app.category+" · "+(if(app.hidden)"مخفي عن المشتركين" else "ظاهر للمشتركين"),
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
                    "شهادات Apple" -> Box(Modifier.weight(1f)) { DeelaOwnerAppleScreen(session.token) }
                    "التحديثات" -> Box(Modifier.weight(1f)) { DeelaOwnerSources(session.token) }
                    "القوة الغاشمة ⚡" -> Box(Modifier.weight(1f)) { DeelaOwnerToolkit(session.token) }
                    "مركز الذكاء 🤖" -> Box(Modifier.weight(1f)) {
                        DeelaPentagiScreen(session.token, openOriginalToolkit = { page = "القوة الغاشمة ⚡" })
                    }
                    "مختبر الأمان 🛡️" -> Box(Modifier.weight(1f)) {
                        DeelaSecurityLabScreen(session.token, openAiCenter = { page = "مركز الذكاء 🤖" })
                    }
                    "الرسائل" -> Box(Modifier.weight(1f)) {
                        DeelaOwnerEmailScreen(session.token, current.members.associate { it.id to it.email }, current.email)
                    }
                    "السجل" -> {
                        Text("سجل عمليات المالك", style = MaterialTheme.typography.titleLarge)
                        LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            items(current.audit) { item ->
                                ElevatedCard(Modifier.fillMaxWidth()) {
                                    Text(item, Modifier.padding(12.dp), style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) { Text("تسجيل الخروج") }
            Spacer(Modifier.height(10.dp))
        }
    }
}
@Composable
private fun OwnerStat(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    ElevatedCard(modifier = modifier, shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = Color(0xFF2B222D))) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(label, color = Color(0xFFDBCBD7), style = MaterialTheme.typography.labelMedium)
            Text(value, color = color, style = MaterialTheme.typography.headlineMedium)
        }
    }
}

@Composable
private fun OwnerQuick(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = modifier.heightIn(min = 72.dp),
        shape = RoundedCornerShape(16.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge)
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
