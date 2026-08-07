package com.fpt.sccw.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FirstTimeSetupRequest {
    
    private String currentPassword;
    
    private String newPassword;
    
    private String confirmNewPassword;
    
    private boolean acceptPolicy;
}
