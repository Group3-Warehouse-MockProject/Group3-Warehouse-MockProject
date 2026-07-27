package com.fpt.sccw.config;

import com.fpt.sccw.interceptor.RealtimeUpdateInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final RealtimeUpdateInterceptor realtimeUpdateInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(realtimeUpdateInterceptor)
                .addPathPatterns("/api/**");
    }
}
