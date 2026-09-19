package com.xiaoju.framework.handler;

import com.xiaoju.framework.entity.persistent.ExecRecord;
import com.xiaoju.framework.entity.persistent.TestCase;
import com.xiaoju.framework.mapper.ExecRecordMapper;
import com.xiaoju.framework.mapper.TestCaseMapper;
import org.junit.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class RecordEntityPersistenceTests {

    @Test
    public void persistsExecutionProgressImmediatelyAfterEdit() {
        TestCaseMapper caseMapper = mock(TestCaseMapper.class);
        ExecRecordMapper recordMapper = mock(ExecRecordMapper.class);

        TestCase testCase = new TestCase();
        testCase.setId(2209L);
        testCase.setCaseContent(caseContent(null));

        ExecRecord record = new ExecRecord();
        record.setId(900L);
        record.setCaseContent("");
        record.setExecutors("");

        when(caseMapper.selectOne(2209L)).thenReturn(testCase);
        when(recordMapper.selectOne(900L)).thenReturn(record);

        RecordEntity entity = new RecordEntity("record-900", 2209L, caseMapper, 900L, recordMapper);
        entity.setCaseContent(caseContent(1));
        entity.persistExecutionRecord("admin");

        ArgumentCaptor<ExecRecord> captor = ArgumentCaptor.forClass(ExecRecord.class);
        verify(recordMapper).update(captor.capture());
        ExecRecord saved = captor.getValue();
        assertEquals(Integer.valueOf(1), saved.getFailCount());
        assertEquals(Integer.valueOf(1), saved.getPassCount());
        assertEquals("admin", saved.getExecutors());
        assertTrue(saved.getCaseContent().contains("leaf-1"));
    }

    private String caseContent(Integer progress) {
        String progressValue = progress == null ? "" : ",\"progress\":" + progress;
        return "{\"base\":1,\"root\":{\"data\":{\"id\":\"root\",\"text\":\"root\"},"
                + "\"children\":[{\"data\":{\"id\":\"leaf-1\",\"text\":\"case\"" + progressValue
                + "},\"children\":[]}]}}";
    }
}
