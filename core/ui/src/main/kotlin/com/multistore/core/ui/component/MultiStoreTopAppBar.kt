package com.multistore.core.ui.component

import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.RowScope
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics

/**
 * The top bar common to every screen.
 *
 * It exists for one reason: without a shared component, seven features would end up with seven
 * slightly different top bars. [title] arrives already resolved by the caller.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MultiStoreTopAppBar(
    title: String,
    modifier: Modifier = Modifier,
    scrollBehavior: TopAppBarScrollBehavior? = null,
    marquee: Boolean = false,
    actions: @Composable RowScope.() -> Unit = {},
) {
    CenterAlignedTopAppBar(
        title = {
            Text(
                // Only the Home greeting scrolls. Repeating it guarantees movement on
                // larger screens; accessibility still announces the greeting once.
                text = if (marquee) "$title     •     $title" else title,
                modifier = if (marquee) {
                    Modifier
                        .fillMaxWidth()
                        .basicMarquee(
                            iterations = Int.MAX_VALUE,
                            repeatDelayMillis = 1000,
                            initialDelayMillis = 650,
                        )
                        .semantics { contentDescription = title }
                } else {
                    Modifier
                },
                style = MaterialTheme.typography.titleLarge,
                color = if (marquee) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                softWrap = false,
                overflow = if (marquee) TextOverflow.Clip else TextOverflow.Ellipsis,
            )
        },
        actions = actions,
        scrollBehavior = scrollBehavior,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.surface,
            scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
            titleContentColor = MaterialTheme.colorScheme.onSurface,
            actionIconContentColor = MaterialTheme.colorScheme.onSurfaceVariant,
        ),
        modifier = modifier,
    )
}
