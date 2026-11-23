package dev.aurastore.store.auth

import androidx.compose.foundation.layout.*
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

private data class OwnerMember(val id:String,val email:String,val role:String,val active:Boolean,val suspended:Boolean,val endsAt:String)
private data class OwnerRequest(val id:String,val userId:String,val email:String,val months:Int,val platform:String)
private data class OwnerData(val members:List<OwnerMember>,val audit:List<String>,val email:String,val requests:List<OwnerRequest>)
private object OwnerApi {
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
    val scope=rememberCoroutineScope()
    var page by remember { mutableStateOf("الرئيسية") }
    var data by remember { mutableStateOf<OwnerData?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var pending by remember { mutableStateOf<Pair<OwnerMember,String>?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var selectedMonths by remember { mutableIntStateOf(1) }
    var requestReview by remember { mutableStateOf<Pair<OwnerRequest,String>?>(null) }
    var mailNotice by remember { mutableStateOf<String?>(null) }
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
    val rose = Color(0xFFC883A0)
    val ownerScheme = darkColorScheme(
        primary = rose,
        onPrimary = Color(0xFF24131E),
        secondary = Color(0xFFC7A9D5),
        onSecondary = Color(0xFF27192C),
        tertiary = Color(0xFF8EC7A8),
        background = Color(0xFF100E15),
        surface = Color(0xFF221A25),
        surfaceVariant = Color(0xFF322634),
        onSurface = Color(0xFFF7EDF4),
        onSurfaceVariant = Color(0xFFCDBDCC),
        outline = Color(0xFF6C5065),
        error = Color(0xFFE49EA5),
    )
    MaterialTheme(colorScheme = ownerScheme) {
        Column(
            modifier = Modifier.fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color(0xFF291C29), Color(0xFF100E15))))
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
                listOf("الرئيسية", "الطلبات", "المشتركون", "التحديثات", "القوة الغاشمة ⚡", "الرسائل", "السجل").forEach { tab ->
                    FilterChip(
                        selected = page == tab,
                        onClick = { page = tab },
                        label = { Text(tab) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF664052),
                            selectedLabelColor = Color.White,
                            containerColor = Color(0xFF211921),
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
                                    colors = CardDefaults.elevatedCardColors(containerColor = Color(0xFF342232)),
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
                                    label = { Text(if (months == 12) "سنة" else "$" + months + " شهر") })
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
                    "التحديثات" -> Box(Modifier.weight(1f)) { DeelaOwnerSources(session.token) }
                    "القوة الغاشمة ⚡" -> Box(Modifier.weight(1f)) { DeelaOwnerToolkit(session.token) }
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
