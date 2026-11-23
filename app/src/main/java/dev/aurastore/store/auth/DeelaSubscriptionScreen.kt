package dev.aurastore.store.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@Composable
fun DeelaSubscriptionScreen(session:DeelaSession,onActivated:(DeelaSession)->Unit,onLogout:()->Unit) {
    val scope=rememberCoroutineScope()
    var months by remember {mutableIntStateOf(1)}
    var busy by remember {mutableStateOf(false)}
    var status by remember {mutableStateOf("اختر مدة الاشتراك ثم أرسل الطلب إلى المالك.")}
    Surface(Modifier.fillMaxSize(),color=MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxSize().padding(24.dp),verticalArrangement=Arrangement.Center) {
            Text("تطبيقات ديلا ❤️",style=MaterialTheme.typography.headlineMedium,color=MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(18.dp))
            Text("طلب اشتراك جديد",style=MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(12.dp))
            Text("اختر المدة المطلوبة:")
            listOf(1,2,3,6,12).forEach {m->
                Row {
                    RadioButton(selected=months==m,onClick={months=m})
                    Text(if(m==12)"سنة كاملة" else "$m شهر",modifier=Modifier.padding(top=12.dp))
                }
            }
            Button(enabled=!busy,onClick={
                busy=true
                scope.launch {
                    val result=DeelaAuthApi.submitSubscription(session.token,months)
                    status=result.getOrElse {it.message?:"تعذر إرسال الطلب"}
                    busy=false
                }
            },modifier=Modifier.fillMaxWidth()) {Text("إرسال الطلب للمالك")}
            OutlinedButton(enabled=!busy,onClick={
                busy=true
                scope.launch {
                    when (val result = DeelaAuthApi.checkSession(session)) {
                        is DeelaSessionCheck.Verified ->
                            if (result.session.subscriptionActive) onActivated(result.session)
                            else status = "لم يُفعّل اشتراكك بعد. يمكنك المحاولة بعد موافقة المالك."
                        DeelaSessionCheck.Invalid -> status = "انتهت جلسة الدخول. سجّل الدخول مجددًا."
                        DeelaSessionCheck.Unavailable -> status = "تعذر الاتصال. حاول بعد قليل، حسابك محفوظ."
                    }
                    busy=false
                }
            },modifier=Modifier.fillMaxWidth()) {Text("التحقق من التفعيل")}
            Text(status)
            TextButton(onClick=onLogout) {Text("تسجيل الخروج")}
        }
    }
}
