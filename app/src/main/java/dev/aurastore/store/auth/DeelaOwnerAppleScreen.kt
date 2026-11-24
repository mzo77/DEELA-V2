package dev.aurastore.store.auth

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import dev.aurastore.store.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.TimeUnit

private data class AppleGroup(
    val id:String,val title:String,val method:String,val provider:String,val team:String,
    val limit:Int,val p12:Boolean,val profile:Boolean,val expires:String
)
private data class AppleDevice(
    val id:String,val groupId:String,val userId:String,val deviceName:String,val udid:String,
    val state:String,val lastError:String
)
private data class AppleSubscriber(val id:String,val label:String)
private data class AppleOverview(
    val groups:List<AppleGroup>,val devices:List<AppleDevice>,
    val members:List<AppleSubscriber>,val apiReady:Boolean
)

private object DeelaAppleOwnerApi {
    private val base get()=BuildConfig.DEELA_API_BASE_URL.trimEnd('/')
    private val client=OkHttpClient.Builder().callTimeout(28,TimeUnit.SECONDS).build()
    private fun call(token:String,path:String,body:RequestBody?=null):JSONObject {
        val builder=Request.Builder().url(base+path).header("Authorization","Bearer "+token)
            .header("Accept","application/json")
        if(body!=null)builder.post(body)
        client.newCall(builder.build()).execute().use { response ->
            val raw=response.body?.string().orEmpty()
            val json=runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
            if(!response.isSuccessful)error(json.optString("error").ifBlank{"فشل الاتصال بالخدمة: "+response.code})
            return json
        }
    }
    private fun asJson(value:JSONObject)=value.toString().toRequestBody("application/json".toMediaType())
    suspend fun overview(token:String):AppleOverview=withContext(Dispatchers.IO) {
        val certs=call(token,"/api/owner/apple/certificates")
        val dashboard=call(token,"/api/owner/dashboard")
        val groupsArray=certs.optJSONArray("certificates")
        val deviceArray=certs.optJSONArray("devices")
        val memberArray=dashboard.optJSONArray("members")
        AppleOverview(
            groups=(0 until (groupsArray?.length()?:0)).map { i ->
                val x=groupsArray!!.getJSONObject(i)
                AppleGroup(
                    id=x.optString("id"),title=x.optString("title"),method=x.optString("method"),
                    provider=x.optString("provider_name"),team=x.optString("team_id"),
                    limit=x.optInt("device_limit",100),p12=x.optBoolean("has_p12"),
                    profile=x.optBoolean("has_profile"),expires=x.optString("certificate_expires_at")
                )
            },
            devices=(0 until (deviceArray?.length()?:0)).map { i ->
                val x=deviceArray!!.getJSONObject(i)
                AppleDevice(
                    id=x.optString("id"),groupId=x.optString("signing_group_id"),userId=x.optString("user_id"),
                    deviceName=x.optString("device_name"),udid=x.optString("udid"),
                    state=x.optString("state"),lastError=x.optString("last_error").takeUnless{it=="null"}?:""
                )
            },
            members=(0 until (memberArray?.length()?:0)).mapNotNull { i ->
                val x=memberArray!!.getJSONObject(i)
                if(x.optString("role")=="owner"||x.optString("platform")!="ios")null
                else AppleSubscriber(
                    id=x.optString("id"),label=x.optString("email").ifBlank{x.optString("display_name").ifBlank{x.optString("id")}}
                )
            },
            apiReady=certs.optBoolean("apple_api_configured",false)
        )
    }
    suspend fun createGroup(token:String,title:String,method:String,team:String,provider:String)=withContext(Dispatchers.IO){
        val data=JSONObject().put("title",title).put("method",method).put("team_id",team.uppercase())
            .put("provider_name",provider).put("device_limit",100)
        call(token,"/api/owner/apple/certificates",asJson(data))
    }
    suspend fun addDevice(token:String,group:String,user:String,name:String,udid:String)=withContext(Dispatchers.IO){
        val data=JSONObject().put("certificate_id",group).put("user_id",user)
            .put("device_name",name).put("udid",udid)
        call(token,"/api/owner/apple/devices",asJson(data))
    }
    suspend fun register(token:String,id:String)=withContext(Dispatchers.IO){
        call(token,"/api/owner/apple/devices/register",asJson(JSONObject().put("enrollment_id",id)))
    }
    suspend fun upload(token:String,context:Context,group:String,kind:String,uri:Uri)=withContext(Dispatchers.IO){
        val ext=if(kind=="p12")".p12" else ".mobileprovision"
        var name=if(kind=="p12")"certificate.p12" else "profile.mobileprovision"
        context.contentResolver.query(uri,arrayOf(OpenableColumns.DISPLAY_NAME),null,null,null)?.use { cursor ->
            if(cursor.moveToFirst()){
                val i=cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if(i>=0)name=cursor.getString(i)?:name
            }
        }
        if(!name.lowercase().endsWith(ext))error("اختر ملفًا بصيغة "+ext)
        val output=ByteArrayOutputStream()
        val stream=context.contentResolver.openInputStream(uri)?:error("تعذر قراءة الملف")
        stream.use { input ->
            val buffer=ByteArray(8192)
            while(true){
                val n=input.read(buffer)
                if(n<0)break
                output.write(buffer,0,n)
                if(output.size()>4*1024*1024)error("حجم الملف يتجاوز 4 ميجابايت")
            }
        }
        val multipart=MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("certificate_id",group)
            .addFormDataPart("kind",kind)
            .addFormDataPart("file",name,output.toByteArray().toRequestBody("application/octet-stream".toMediaType()))
            .build()
        call(token,"/api/owner/apple/certificates/file",multipart)
    }
}
@Composable
fun DeelaOwnerAppleScreen(token:String){
    val scope=rememberCoroutineScope()
    val context=LocalContext.current
    var overview by remember { mutableStateOf(AppleOverview(emptyList(),emptyList(),emptyList(),false)) }
    var reload by remember { mutableIntStateOf(0) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var team by remember { mutableStateOf("") }
    var method by remember { mutableStateOf("ad_hoc") }
    var provider by remember { mutableStateOf("Apple Developer") }
    var group by remember { mutableStateOf("") }
    var user by remember { mutableStateOf("") }
    var deviceName by remember { mutableStateOf("") }
    var udid by remember { mutableStateOf("") }
    var fileKind by remember { mutableStateOf("p12") }
    var pendingRegister by remember { mutableStateOf<AppleDevice?>(null) }
    val picker=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if(uri!=null && group.isNotBlank()){
            busy=true
            scope.launch{
                try{
                    DeelaAppleOwnerApi.upload(token,context,group,fileKind,uri)
                    message="حُفظ الملف في التخزين الخاص. لم يتم توقيع التطبيقات."
                    reload++
                }catch(e:Exception){message=e.message?:"تعذر رفع الملف"}
                finally{busy=false}
            }
        }
    }
    LaunchedEffect(token,reload){
        busy=true
        try{
            overview=DeelaAppleOwnerApi.overview(token)
            if(group.isBlank()||overview.groups.none{it.id==group})group=overview.groups.firstOrNull()?.id?:""
            if(user.isBlank()||overview.members.none{it.id==user})user=overview.members.firstOrNull()?.id?:""
        }catch(e:Exception){message=e.message?:"تعذر الاتصال بنظام الشهادات"}
        finally{busy=false}
    }
    pendingRegister?.let {device->
        AlertDialog(
            onDismissRequest={pendingRegister=null},
            title={Text("تسجيل جهاز لدى Apple")},
            text={Text("سيرسل UDID الخاص بالجهاز إلى Apple. التسجيل الحقيقي يستهلك حصة من حد أجهزة Apple السنوي، ولا يوقّع IPA تلقائيًا. هل توافق؟")},
            confirmButton={TextButton(onClick={
                pendingRegister=null
                busy=true
                scope.launch {
                    try{
                        DeelaAppleOwnerApi.register(token,device.id)
                        message="أكدت Apple تسجيل الجهاز. التوقيع والتثبيت لم يحدثا بعد."
                        reload++
                    }catch(e:Exception){message=e.message?:"تعذر تسجيل الجهاز"}
                    finally{busy=false}
                }
            }){Text("تسجيل لدى Apple")}},
            dismissButton={TextButton(onClick={pendingRegister=null}){Text("إلغاء")}}
        )
    }
    LazyColumn(
        modifier=Modifier.fillMaxSize(),
        contentPadding=PaddingValues(bottom=18.dp),
        verticalArrangement=Arrangement.spacedBy(11.dp)
    ){
        item {
            Text("شهادات Apple وتفعيل الآيفون",style=MaterialTheme.typography.titleLarge)
            Text("سجلات حقيقية داخل ديلا، منفصلة عن أندرويد. التسجيل لدى Apple يحتاج مفاتيح App Store Connect في أسرار الخادم، وتوقيع IPA خطوة مستقلة.",
                style=MaterialTheme.typography.bodySmall)
            Text(if(overview.apiReady)"Apple API متصل على الخادم" else "Apple API غير متصل — يمكنك تجهيز الشهادات والأجهزة الآن",
                color=if(overview.apiReady)MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary)
            if(busy)LinearProgressIndicator(Modifier.fillMaxWidth())
            if(message.isNotBlank())Text(message,color=MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedButton(onClick={reload++},enabled=!busy){Text("تحديث")}
        }
        item {
            HorizontalDivider()
            Text("1. إضافة شهادة",style=MaterialTheme.typography.titleMedium)
            OutlinedTextField(title,{title=it},label={Text("اسم الشهادة")},modifier=Modifier.fillMaxWidth(),singleLine=true)
            Row(Modifier.horizontalScroll(rememberScrollState()),horizontalArrangement=Arrangement.spacedBy(7.dp)){
                FilterChip(selected=method=="ad_hoc",onClick={method="ad_hoc";provider="Apple Developer"},label={Text("Apple Developer / Ad Hoc")})
                FilterChip(selected=method=="licensed_provider",onClick={method="licensed_provider";provider=""},label={Text("مزود خارجي")})
            }
            OutlinedTextField(team,{team=it},label={Text("Team ID — مطلوب لحساب Apple")},modifier=Modifier.fillMaxWidth(),singleLine=true)
            OutlinedTextField(provider,{provider=it},label={Text("اسم المزود")},modifier=Modifier.fillMaxWidth(),singleLine=true)
            Button(enabled=!busy&&title.trim().length>=2&&(method!="ad_hoc"||team.trim().length==10),onClick={
                busy=true
                scope.launch{
                    try{
                        DeelaAppleOwnerApi.createGroup(token,title.trim(),method,team.trim(),provider.trim())
                        title="";team="";message="تم حفظ سجل الشهادة؛ لا يعني التفعيل."
                        reload++
                    }catch(e:Exception){message=e.message?:"تعذر حفظ الشهادة"}
                    finally{busy=false}
                }
            }){Text("إضافة الشهادة")}
        }
        items(overview.groups,key={it.id}){g->
            ElevatedCard(Modifier.fillMaxWidth()){
                Column(Modifier.padding(13.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){
                    Text(g.title,style=MaterialTheme.typography.titleSmall)
                    Text((if(g.method=="ad_hoc")"Apple Developer" else g.provider)+" • "+overview.devices.count{it.groupId==g.id}+"/"+g.limit+" جهاز")
                    Text("P12: "+(if(g.p12)"ملف محفوظ" else "غير مرفوع")+" · ملف التوزيع: "+(if(g.profile)"مرفوع غير متحقق" else "غير مرفوع"),
                        style=MaterialTheme.typography.bodySmall)
                    if(g.expires.isNotBlank()&&g.expires!="null")Text("تنتهي: "+g.expires.take(10))
                    TextButton(onClick={group=g.id}){Text(if(group==g.id)"الشهادة المحددة ✓" else "اختيار الشهادة")}
                }
            }
        }
        item{
            HorizontalDivider()
            Text("2. إضافة ملف شهادة خاص",style=MaterialTheme.typography.titleMedium)
            Text("اختر شهادة أعلاه. يُحفظ الملف بصورة خاصة ولا تُحفظ كلمات المرور داخل التطبيق.",
                style=MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement=Arrangement.spacedBy(7.dp)){
                FilterChip(selected=fileKind=="p12",onClick={fileKind="p12"},label={Text("P12")})
                FilterChip(selected=fileKind=="profile",onClick={fileKind="profile"},label={Text("mobileprovision")})
            }
            Button(enabled=!busy&&group.isNotBlank(),onClick={picker.launch("*/*")}){Text("اختيار الملف ورفعه")}
        }
        item{
            HorizontalDivider()
            Text("3. ربط جهاز مشترك",style=MaterialTheme.typography.titleMedium)
            val cert=overview.groups.find{it.id==group}
            Text("الشهادة: "+(cert?.title?:"اختر شهادة أولًا"),style=MaterialTheme.typography.bodySmall)
            var expanded by remember { mutableStateOf(false) }
            Box {
                OutlinedButton(onClick={expanded=true},enabled=overview.members.isNotEmpty()){
                    Text(overview.members.find{it.id==user}?.label?:"اختر مشترك آيفون")
                }
                DropdownMenu(expanded=expanded,onDismissRequest={expanded=false}){
                    overview.members.forEach{m->
                        DropdownMenuItem(text={Text(m.label)},onClick={user=m.id;expanded=false})
                    }
                }
            }
            OutlinedTextField(deviceName,{deviceName=it},label={Text("اسم جهاز الآيفون")},modifier=Modifier.fillMaxWidth(),singleLine=true)
            OutlinedTextField(udid,{udid=it},label={Text("UDID من جهاز المشترك")},modifier=Modifier.fillMaxWidth(),singleLine=true)
            val validUdid=Regex("^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{8}-[a-fA-F0-9]{16})$").matches(udid.trim())
            Button(enabled=!busy&&group.isNotBlank()&&user.isNotBlank()&&deviceName.trim().length>=2&&validUdid,onClick={
                busy=true
                scope.launch{
                    try{
                        DeelaAppleOwnerApi.addDevice(token,group,user,deviceName.trim(),udid.trim())
                        deviceName="";udid="";message="تم ربط الجهاز محليًا. انتظر تأكيد تسجيله لدى Apple."
                        reload++
                    }catch(e:Exception){message=e.message?:"تعذر إضافة الجهاز"}
                    finally{busy=false}
                }
            }){Text("إضافة جهاز المشترك")}
        }
        items(overview.devices.filter{group.isBlank()||it.groupId==group},key={it.id}){d->
            ElevatedCard(Modifier.fillMaxWidth()){
                Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){
                    Text(d.deviceName,style=MaterialTheme.typography.titleSmall)
                    Text(overview.members.find{it.id==d.userId}?.label?:d.userId.take(8))
                    Text("UDID: ••••"+d.udid.takeLast(7),style=MaterialTheme.typography.bodySmall)
                    Text(when(d.state){
                        "apple_registered"->"مسجل لدى Apple — لم يتم توقيع أو تثبيت IPA"
                        "registration_failed"->"فشل تسجيل الجهاز"
                        else->"بانتظار تسجيل الجهاز"
                    })
                    if(d.lastError.isNotBlank())Text(d.lastError,style=MaterialTheme.typography.bodySmall)
                    if(d.state!="apple_registered"){
                        TextButton(enabled=!busy&&overview.apiReady,onClick={pendingRegister=d}){
                            Text("تسجيل الجهاز لدى Apple")
                        }
                    }
                }
            }
        }
        item{
            HorizontalDivider()
            Text("التشغيل الفعلي",style=MaterialTheme.typography.titleMedium)
            Text("للتسجيل المباشر، أضف DEELA_APPLE_ISSUER_ID وDEELA_APPLE_KEY_ID وDEELA_APPLE_API_PRIVATE_KEY_P8 في Supabase Edge Function Secrets. لا تحفظ مفاتيح Apple داخل التطبيق.",
                style=MaterialTheme.typography.bodySmall)
            Text("Ad Hoc للاختبار على أجهزة مسجلة فقط، وليس متجرًا تجاريًا مفتوحًا. التسجيل لدى Apple لا يفعّل تثبيت IPA من دون ملف توزيع وتوقيع قانوني.",
                style=MaterialTheme.typography.bodySmall)
        }
    }
}
