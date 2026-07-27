package com.fpt.sccw.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEventDTO {
    
    private String id;
    private String userId;
    private String title;
    private String message;
    private String type;
    private String createdAt;
    private boolean isRead;

}
