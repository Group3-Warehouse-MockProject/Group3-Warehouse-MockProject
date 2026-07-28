package com.fpt.sccw.interceptor;

import com.fpt.sccw.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
@Slf4j
public class RealtimeUpdateInterceptor implements HandlerInterceptor {

    private final NotificationService notificationService;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        if (ex == null && response.getStatus() >= 200 && response.getStatus() < 300) {
            String method = request.getMethod();
            if ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) 
                || "DELETE".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method)) {
                
                String uri = request.getRequestURI();
                String resource = resolveResource(uri);
                if (resource != null) {
                    log.info("Broadcasting {} refresh due to {} {}", resource, method, uri);
                    notificationService.broadcastEvent("REFRESH_DATA", java.util.Map.of("resource", resource));
                }
            }
        }
    }

    private String resolveResource(String uri) {
        if (uri == null) return null;
        if (uri.startsWith("/api/products")) return "products";
        if (uri.startsWith("/api/receipts")) return "receipts";
        if (uri.startsWith("/api/transfers")) return "transfers";
        if (uri.startsWith("/api/stocktake")) return "stocktake";
        if (uri.startsWith("/api/suppliers")) return "suppliers";
        if (uri.startsWith("/api/warehouses")) return "warehouses";
        if (uri.startsWith("/api/categories")) return "categories";
        if (uri.startsWith("/api/locations")) return "locations";
        if (uri.startsWith("/api/inventory")) return "inventory";
        if (uri.startsWith("/api/users")) return "users";
        return null;
    }
}
