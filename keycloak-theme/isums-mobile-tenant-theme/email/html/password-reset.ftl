<#import "template.ftl" as layout>
<#assign linkWithLocale = link />
<#if !link?contains("kc_locale=")>
  <#assign sep = link?contains("?")?then("&", "?") />
  <#assign lct = locale.toLanguageTag() />
  <#assign linkWithLocale = link + sep + "kc_locale=" + lct?url('UTF-8') + "&ui_locales=" + lct?url('UTF-8') />
</#if>
<@layout.emailLayout>
${kcSanitize(msg("passwordResetBodyHtml",linkWithLocale, linkExpiration, realmName, linkExpirationFormatter(linkExpiration)))?no_esc}
</@layout.emailLayout>
