package com.fpt.sccw.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

/**
 * Cấu hình Spring AI beans.
 * Spring AI 2.0.0 không tự tạo ChatClient bean — phải khai báo thủ công.
 */
@Configuration
@ConditionalOnProperty(name = "app.ai.enabled", havingValue = "true", matchIfMissing = true)
public class AiConfig {

    /**
     * Tạo ChatClient từ ChatModel (được auto-configure bởi spring-ai-starter-model-google-genai).
     */
    @Bean
    public ChatClient chatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel).build();
    }
}
