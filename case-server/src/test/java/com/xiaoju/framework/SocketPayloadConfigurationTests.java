package com.xiaoju.framework;

import org.junit.Test;

import java.io.InputStream;
import java.util.Properties;

import static org.junit.Assert.assertTrue;

public class SocketPayloadConfigurationTests {

    private static final int MINIMUM_LARGE_CASE_PAYLOAD_BYTES = 16 * 1024 * 1024;

    @Test
    public void websocketPayloadLimitsSupportLargeCaseSets() throws Exception {
        Properties properties = new Properties();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream("application.properties")) {
            properties.load(input);
        }

        int frameLimit = Integer.parseInt(properties.getProperty("socketio.maxFramePayloadLength"));
        int httpLimit = Integer.parseInt(properties.getProperty("socketio.maxHttpContentLength"));

        assertTrue("WebSocket frame limit must support large case sets", frameLimit >= MINIMUM_LARGE_CASE_PAYLOAD_BYTES);
        assertTrue("WebSocket HTTP limit must support large case sets", httpLimit >= MINIMUM_LARGE_CASE_PAYLOAD_BYTES);
    }
}
