package dev.aurastore.store.auth

import androidx.compose.foundation.layout.*
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
private data class OwnerRequest(val id:String,val email:String,val months:Int,val platform:String)
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
    var data by remember { mutableStateOf<OwnerData?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var pending by remember { mutableStateOf<Pair<OwnerMember,String>?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var selectedMonths by remember { mutableIntStateOf(1) }
    var requestReview by remember { mutableStateOf<Pair<OwnerRequest,String>?>(null) }
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
            Row(horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                listOf("الرئيسية","الطلبات","المشتركون","السجل").forEach { tab ->
                    FilterChip(selected=page==tab,onClick={page=tab},label={Text(tab)})
                }
            }
            if(busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let {
                Text(it,color=MaterialTheme.colorScheme.error)
                TextButton(onClick={reload++}) {Text("إعادة المحاولة")}
            }
            val current=data
            if(current!=null) {
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
