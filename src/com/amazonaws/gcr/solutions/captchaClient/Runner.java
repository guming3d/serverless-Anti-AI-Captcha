package com.amazonaws.gcr.solutions.captchaClient;

import com.amazonaws.http.HttpMethodName;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.URISyntaxException;

public class Runner {
// example:
// static final String AWS_REGION = "cn-northwest-1"; //for example "cn-northwest-1"
    static final String AWS_REGION = "{AWS_REGION}"; //for example "cn-northwest-1"
// example:
// static final String AWS_API_GATEWAY_ENPOINT = "https://a9u6c5e1pe.execute-api.cn-northwest-1.amazonaws.com.cn/prod/"; //for example https://234n34k5678k.execute-api.eu-west-1.amazonaws.com
    static final String AWS_API_GATEWAY_ENPOINT = "{API_GATEWAY_ENDPOINT}";

    static final String exampleJsonRequest = "{\n" +
//            "  \"type\": \"dog\",\n" +
//            "  \"price\": 249.99\n" +
            "}";

    public static void main(String... args) {
        try {
            JsonApiGatewayCaller caller = new JsonApiGatewayCaller(
                    null,
                    AWS_REGION,
                    new URI(AWS_API_GATEWAY_ENPOINT)
            );

            ApiGatewayResponse response = caller.execute(HttpMethodName.GET, "/captcha", new ByteArrayInputStream(exampleJsonRequest.getBytes()));

            System.out.println(response.getBody());

        } catch (URISyntaxException e) {
            e.printStackTrace();
        }
    }

}
