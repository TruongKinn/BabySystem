package com.mom.expense.exchangerate;

import com.mom.expense.controller.dto.ExchangeRateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class VietcombankRateFetcher {

    private static final String VIETCOMBANK_XML_URL =
            "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx";

    private final RestTemplate exchangeRateRestTemplate;

    public List<ExchangeRateResponse> fetch() {
        try {
            String xml = exchangeRateRestTemplate.getForObject(VIETCOMBANK_XML_URL, String.class);
            if (xml == null || xml.isBlank()) {
                throw new IllegalStateException("Empty response from Vietcombank exchange rate API");
            }
            return parseXml(xml);
        } catch (Exception e) {
            log.error("Failed to fetch exchange rates from Vietcombank: {}", e.getMessage(), e);
            throw new ExchangeRateFetchException("Unable to fetch exchange rates from Vietcombank. Please try again later.");
        }
    }

    private List<ExchangeRateResponse> parseXml(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));

        NodeList exrateNodes = doc.getElementsByTagName("Exrate");
        List<ExchangeRateResponse> rates = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now();

        for (int i = 0; i < exrateNodes.getLength(); i++) {
            Element el = (Element) exrateNodes.item(i);
            String currency = el.getAttribute("CurrencyCode").trim().toUpperCase();
            BigDecimal buy = parseRate(el.getAttribute("Buy"));
            BigDecimal sell = parseRate(el.getAttribute("Sell"));

            if (currency.isEmpty() || sell == null) {
                continue;
            }

            rates.add(new ExchangeRateResponse(currency, buy, sell, now));
        }

        log.info("Fetched {} exchange rates from Vietcombank", rates.size());
        return rates;
    }

    private BigDecimal parseRate(String value) {
        if (value == null || value.isBlank() || value.equals("-")) {
            return null;
        }
        try {
            return new BigDecimal(value.replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
