package dev.aurastore.store.auth

import androidx.compose.foundation.layout.*
import android.content.Intent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.graphics.Color
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
fun DeelaOwnerScreen(session:DeelaSession,onLogout:()->Unit,onOpenStore:()->Unit) {
    // Keep the owner's palette separate: subscriber storefront retains its existing brand.
    val baseColors = MaterialTheme.colorScheme
    val ownerColors = baseColors.copy(
        primary = Color(0xFF80D6D6),
        onPrimary = Color(0xFF0C2433),
        primaryContainer = Color(0xFF244953),
        onPrimaryContainer = Color(0xFFDBFAF7),
        secondary = Color(0xFFADC5FA),
        onSecondary = Color(0xFF16243F),
        secondaryContainer = Color(0xFF2A4166),
        onSecondaryContainer = Color(0xFFE0ECFF),
        error = Color(0xFFD9B683),
        onError = Color(0xFF261C11),
        errorContainer = Color(0xFF433D30),
        onErrorContainer = Color(0xFFF6E6C4),
        background = Color(0xFF0E1929),
        onBackground = Color(0xFFE7F2FC),
        surface = Color(0xFF18273A),
        onSurface = Color(0xFFEAF4FF),
        surfaceVariant = Color(0xFF263B52),
        onSurfaceVariant = Color(0xFFCBDCEA),
        outline = Color(0xFF587089)
    )
    MaterialTheme(colorScheme = ownerColors) {
        DeelaOwnerScreenBody(session=session,onLogout=onLogout,onOpenStore=onOpenStore)
    }
}

@Composable
private fun DeelaOwnerScreenBody(session:DeelaSession,onLogout:()->Unit,onOpenStore:()->Unit) {
    val context=LocalContext.current
    val openCenter={
        context.startActivity(
            Intent(context,DeelaEmbeddedOwnerActivity::class.java)
                .putExtra(DeelaEmbeddedOwnerActivity.EXTRA_OWNER_TOKEN,session.token)
        )
    }
    val scope=rememberCoroutineScope()
    var page by remember { mutableStateOf("الرئيسية") }
    var data by remember { mutableStateOf<OwnerData?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var pending by remember { mutableStateOf<Pair<OwnerMember,String>?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var selectedMonths by remember { mutableIntStateOf(1) }
    var customMonths by remember { mutableStateOf("1") }
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
            text={
                Column(verticalArrangement=Arrangement.spacedBy(10.dp)) {
                    Text("الحساب: "+member.email+"\nالإجراء: "+actionLabel(action))
                    if(action=="renew") {
                        OutlinedTextField(
                            value=customMonths,
                            onValueChange={ value ->
                                customMonths=value.filter { it.isDigit() }.take(2)
                            },
                            label={Text("عدد أشهر التجديد (1 إلى 36)")},
                            keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Number),
                            supportingText={Text("تُضاف المدة إلى نهاية الاشتراك الحالي إن كان ساريًا.")},
                            singleLine=true
                        )
                    }
                }
            },
            confirmButton={ TextButton(
                enabled=!busy && (action!="renew" || customMonths.toIntOrNull() in 1..36),
                onClick={
                    val months=if(action=="renew") customMonths.toIntOrNull() else 1
                    if(months==null || months !in 1..36) return@TextButton
                    pending=null;busy=true
                    scope.launch {
                        try { OwnerApi.subscription(session.token,member.id,action,months);reload++ }
                        catch(e:Exception) { error=e.message?:"فشل التعديل" }
                        finally { busy=false }
                    }
                }
            ) { Text(if(action=="renew") "تأكيد التجديد" else "تأكيد") } },
            dismissButton={ TextButton(onClick={ pending=null }) { Text("إلغاء") } }
        )
    }
    Surface(Modifier.fillMaxSize(),color=MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxSize().padding(horizontal=18.dp)) {
            Spacer(Modifier.height(28.dp))
            Text("تطبيقات ديلا ❤️",style=MaterialTheme.typography.headlineMedium,color=MaterialTheme.colorScheme.primary)
            Text("لوحة تحكم المالك 👑",style=MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(12.dp))
            Row(modifier=Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                listOf("الرئيسية","مركز التحكم","الطلبات","المشتركون","السجل","التحديثات","الرسائل").forEach { tab ->
                    FilterChip(selected=page==tab,onClick={page=tab},label={Text(tab)})
                }
            }
            if(busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            mailNotice?.let { Text(it,style=MaterialTheme.typography.bodySmall) }
            error?.let {
                Text(it,color=MaterialTheme.colorScheme.error)
                TextButton(onClick={reload++}) {Text("إعادة المحاولة")}
            }
            val current=data
            if(current!=null) {
                when(page) {
                    "مركز التحكم" -> {
                        Text("جميع أدوات DEELA في قائمة واحدة خاصة بالمالك.")
                        Spacer(Modifier.height(12.dp))
                        Button(onClick=openCenter,modifier=Modifier.fillMaxWidth()) {
                            Text("فتح مركز التحكم المتكامل")
                        }
                        Text(
                            "الطلبات، المشتركين، ملفات APK وIPA، إدارة الحساب، وروابط المشاريع.",
                            style=MaterialTheme.typography.bodySmall
                        )
                        OutlinedButton(onClick=onOpenStore,modifier=Modifier.fillMaxWidth()) {
                            Text("الانتقال إلى متجر التطبيقات")
                        }
                    }
                    "الرئيسية" -> {
                        val subscribers=current.members.filter {it.role!="owner"}
                        val awaitingReview=current.requests.map { it.userId }.toSet()
                        Text("حساب المالك: "+current.email,style=MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(16.dp))
                        Text("إجمالي المشتركين: "+subscribers.size,style=MaterialTheme.typography.titleMedium)
                        Text("الاشتراكات النشطة: "+subscribers.count {it.active})
                        Text("طلبات الاشتراك المعلقة: "+current.requests.size)
                        Button(onClick={page="مركز التحكم"}) {Text("مركز التحكم الكامل")}
                        Button(onClick=onOpenStore) {Text("متجر التطبيقات")}
                        Button(onClick={page="الطلبات"}) {Text("مراجعة طلبات الاشتراك") }
                        Text("غير النشطة: "+subscribers.count {!it.active && it.id !in awaitingReview})
                        Spacer(Modifier.height(16.dp))
                        Button(onClick={page="المشتركون"}) {Text("إدارة المشتركين والاشتراكات")}
                        OutlinedButton(onClick={reload++}) {Text("تحديث البيانات")}
                        Button(onClick={page="التحديثات"}) {Text("تحديثات جميع المصادر") }
                        HorizontalDivider()
                        Text("قوة غاشمة ⚡",style=MaterialTheme.typography.titleMedium)
                        Text("الأدوات المتقدمة لم تُنقل بعد.")
                    }
                    "الطلبات" -> {
                        Text("طلبات الاشتراك بانتظار موافقتك: ${current.requests.size}", style=MaterialTheme.typography.titleMedium)
                        OutlinedButton(onClick={reload++},enabled=!busy) { Text("تحديث الطلبات الآن") }
                        if (current.requests.isEmpty() && !busy) {
                            Text("لا توجد طلبات اشتراك معلّقة حاليًا.", style=MaterialTheme.typography.bodyMedium)
                        }
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
                                            TextButton(enabled=!busy,onClick={customMonths=selectedMonths.toString();pending=member to "renew"}) {Text("تجديد")}
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
                    "التحديثات" -> DeelaOwnerSources(session.token)
                    "الرسائل" -> DeelaOwnerEmailScreen(
                        session.token,
                        current.members.associate { it.id to it.email },
                        current.email,
                    )
                    "السجل" -> LazyColumn(modifier=Modifier.weight(1f)) {
                        items(current.audit) {event->
                            Text(event,modifier=Modifier.padding(vertical=8.dp))
                            HorizontalDivider()
                        }
                    }
                }
            }
            if (page != "التحديثات" && page != "الرسائل") {
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick=onLogout,modifier=Modifier.fillMaxWidth()) {Text("تسجيل الخروج")}
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}
private fun actionLabel(action:String)=when(action) {
    "trial"->"تجربة 24 ساعة"
    "renew"->"تجديد بمدة مخصصة"
    "suspend"->"إيقاف الاشتراك"
    "resume"->"استئناف الاشتراك"
    "revoke"->"إلغاء الاشتراك"
    else->action
}
