const multer = require('multer');
const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
var express = require('express')
var router = express.Router()
const tryout = require('../../models/tryoutModel')
const uploudPhoto = require('../../config/middleware/uploudPhoto')
const deleteQuestionImage = require('../../config/middleware/deleteQuestionImage')
const deleteOldImageIfReplaced = require('../../config/middleware/deleteOldImageIfReplaced')
const { verifyToken, authorize } = require('../../config/middleware/jwt')

//menampilakn judul tryout, soal yang sudah dibuat dan status
router.get('/teacher/tryout', verifyToken, authorize(['teacher']), async (req, res, next) => {
    try {
        let  dataTryout = await tryout.getall()
        
        res.status(200).json ({ dataTryout })

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

//post judl tryout
router.post('/teacher/tryout/create', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let { tryout_name, exam_mode } = req.body
    let data = { tryout_name, exam_mode }

    if (!tryout_name) return res.status(400).json({ message: 'tryout_name is required.' })

    try {
        await tryout.store(data)
        res.status(201).json ({ message: 'CREATED'})
    } catch (error) {
        res.status(500).json ({ message: error.message })
    }
})

//edit judul tryout
router.patch('/teacher/tryout/update/:id', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let id = req.params.id
    let { tryout_name, exam_mode } = req.body
    let data = { tryout_name, exam_mode }

    if (!tryout_name) return res.status(400).json({ message: 'tryout_name is required.' })

    try {
        await tryout.update(id, data)
        res.status(200).json ({ message: 'OK'})
    } catch (error) {
        res.status(500).json ({ message: error.message})
    }
})

//delete tryout byid
router.delete('/teacher/tryout/delete/:id', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let id = req.params.id
    try {
        await tryout.delete(id)
        res.status(200).json ({ message: 'OK'})
    } catch (error) {
        res.status(500).json ({ message: error.message})
    }
})

//menampilkan kategori subjek beserta nama subejek dan soal yang sudah di buat
router.get('/teacher/tryout/:id', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let tryoutId = req.params.id
    try {
        let tryoutData = await tryout.getTryoutQuestionById(tryoutId)

        res.status(200).json ( tryoutData )
    } catch (error) {
        res.status(500).json ({ message: error.message })
    }
})

router.patch('/teacher/tryout/:id/update_status', verifyToken, authorize(['teacher']), async (req,res,next) => {
    let { status } = req.body
    let data = { status }
    let tryoutId = req.params.id

    if (!status) return res.status(400).json({ message: 'status is required.' })

    try {
        await tryout.updateStatus(data, tryoutId)
        res.status(200).json ({ message: 'OK' })
    } catch (error) {
        res.status(500).json ({ message: error.message})
    }
})

//get soal, opsi jawaban, jawaban benar, pembahasan
//#ok
router.get('/teacher/tryout/:tryoutId/:subjectId', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let { tryoutId, subjectId } = req.params

    try {
        let tryoutQuestionBySubject = await tryout.getAllTryoutQuestionBySubject(tryoutId, subjectId)
        let subject = await tryout.getSubjectByIdSubject(subjectId)
        res.status(200).json({ subject, tryoutQuestionBySubject, data: req.session.tempQuestionData })
    } catch (error) {
        res.status(500).json ({ message: error.message })
    }const handleNext = async (retryCount = 0) => {
  try {
    setLoading(true);
    setError("");
    
    // Validasi input yang lebih ketat
    if (formData.correct_answer_index === null || formData.correct_answer_index === undefined || formData.correct_answer_index === "") {
      setError('Jawaban benar harus dipilih.');
      alert('Jawaban benar harus dipilih.');
      setLoading(false);
      return;
    }

    // Parse ke integer dan validasi
    const correct_answer_index = parseInt(formData.correct_answer_index, 10);
    
    if (isNaN(correct_answer_index) || correct_answer_index < 0) {
      setError('Indeks jawaban benar tidak valid.');
      alert('Indeks jawaban benar tidak valid.');
      setLoading(false);
      return;
    }

    // Validasi pembahasan
    if (!formData.question_explanation?.trim()) {
      setError('Pembahasan soal tidak boleh kosong.');
      alert('Pembahasan soal tidak boleh kosong.');
      setLoading(false);
      return;
    }

    // LANGKAH 1: Kirim data soal ke session server
    const formDataStep1 = new FormData();
    formDataStep1.append('question', questionData.question || '');
    formDataStep1.append('score', questionData.score || '');
    
    if (Array.isArray(questionData.answer_options)) {
      questionData.answer_options.forEach((option) => {
        if (option !== undefined && option !== null) {
          formDataStep1.append('answer_options', option);
        }
      });
    }
    
    const responseStep1 = await axiosInstance.post(
      `/API/teacher/tryout/${tryout_id}/${subject_id}/create_question`,
      formDataStep1,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }
    );
    
    if (responseStep1.status === 201) {
      // LANGKAH 2: Kirim data pembahasan
      const explanationData = {
        id_answer_option: id_answer_option,
        question_explanation: (formData.question_explanation || "").trim(),
        tryout_id: parseInt(tryout_id),
        subject_id: parseInt(subject_id)
      };

      const responseStep2 = await axiosInstance.post(
        `/API/teacher/tryout/${tryout_id}/${subject_id}/create_question/create_explanation`,
        explanationData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (responseStep2.status === 201) {
        navigate(`/guru/tryout/${tryout_id}/${subject_id}`);
        return;
      }
    }
  } catch (error) {
    console.error('Error submitting data:', error);
    setError(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
    setLoading(false);
  } finally {
    setLoading(false);
  }
}
})

//post soal dan opsi soal
//#ok
router.post('/teacher/tryout/:tryout_id/:subject_id/create_question', verifyToken, authorize(['teacher']), uploudPhoto.single('question_image'), async (req, res, next) => {
  try {
    const {tryout_id, subject_id} = req.params
    let { question, score, answer_options } = req.body

    if (!question) return res.status(400).json({ message: 'question is required.' })
    if (!score) return res.status(400).json({ message: 'score is required.' })

    if (!Array.isArray(answer_options)) {
      answer_options = [answer_options]
    }

    const { questionId, insertedOptionIds } = await tryout.storeQuestionWithOptions({
      tryout_id,
      subject_id,
      question,
      score,
      answer_options,
      question_image: req.file ? req.file.filename : null
    });

    req.session.tempQuestionData = { question, score, answer_options, question_image: req.file ? req.file.filename : null }

    res.status(201).json({ message: "CREATED", answer_option_ids: insertedOptionIds });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})

// post jawaban benar dan pembahasan 
//#ok
router.post('/teacher/tryout/:tryoutId/:subjectId', 
  verifyToken, 
  authorize(['teacher']), 
  async (req, res, next) => {
    try {
      const { id_answer_option, question_explanation } = req.body;
      
      if (!id_answer_option) {
        return res.status(400).json({ message: 'id_answer_option is required.' });
      }
      if (!question_explanation || !question_explanation.trim()) {
        return res.status(400).json({ message: 'question_explanation is required.' });
      }

      await tryout.storeExplanation({
        id_answer_option: parseInt(id_answer_option),
        question_explanation: question_explanation.trim()
      });

      res.status(201).json({ message: 'Explanation created successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
});

// patch question and answer options
//#ok
router.patch('/teacher/tryout/:tryout_id/:subject_id/edit_question/:question_id', verifyToken, authorize(['teacher']), uploudPhoto.single('question_image'), deleteOldImageIfReplaced, async (req, res, next) => {
  try {
    const { tryout_id, subject_id, question_id } = req.params
    let { question, score, answer_options } = req.body
    if (!question) return res.status(400).json({ message: 'question is required.' })
    if (!score) return res.status(400).json({ message: 'score is required.' })

    if (!Array.isArray(answer_options)) {
      answer_options = [answer_options]
    }

    const question_image = req.file ? req.file.filename : null

    // Panggil fungsi update ke database
    await tryout.updateQuestionById({
      question_id,
      tryout_id,
      subject_id,
      question,
      score,
      answer_options,
      question_image
    });

    res.status(200).json({ message: "OK" })
  } catch (error) {
    next(error)
  }
});

// patch answer explanation and correct answer
router.patch('/teacher/tryout/:tryout_id/:subject_id/edit_question/:question_id/edit_explanation',verifyToken,authorize(['teacher']),async (req, res, next) => {
    const { tryout_id, subject_id, question_id } = req.params
    let { correct_answer_index, question_explanation } = req.body

    if (!correct_answer_index) return res.status(400).json({ message: 'correct_answer_index is required.' })

    if (typeof correct_answer_index === "undefined") {
      return res.status(400).json({ message: "Indeks jawaban benar tidak valid." })
    }

    correct_answer_index = parseInt(correct_answer_index, 10)
    if (isNaN(correct_answer_index) || correct_answer_index < 0) {
      return res.status(400).json({ message: "Indeks jawaban benar tidak valid." })
    }

    if (typeof question_explanation === "undefined" || question_explanation.trim() === "") {
      return res.status(400).json({ message: "Pembahasan soal tidak boleh kosong." })
    }

    if (!req.session || !req.session.tempQuestionData) {
      return res.status(400).json({ message: "Data soal sementara tidak ditemukan, mohon mulai dari awal." })
    }

    const tempData = req.session.tempQuestionData

    const finalData = {tryout_id,subject_id,question: tempData.question,question_image: tempData.question_image,score: tempData.score,answer_options: tempData.answer_options,correct_answer_index,question_explanation: question_explanation.trim()}

    try {
      await tryout.updateQuestionWithExplanation(parseInt(question_id, 10), finalData)
      req.session.tempQuestionData = null
      res.status(200).json({ message: "OK" })
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  }
)

//delete soal by id question
router.delete('/teacher/tryout/:tryout_id/:subject_id/:question_id/delete', verifyToken, authorize(['teacher']), deleteQuestionImage, async (req, res) => {
  try {
    const { tryout_id, subject_id, question_id } = req.params; 
    console.log(`Tryout ID: ${tryout_id}, Subject ID: ${subject_id}, Question ID: ${question_id}`);

    await tryout.deleteQuestionById(question_id, tryout_id, subject_id);

    res.status(200).json({ message: 'Question successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// Import soal secara massal via Excel/CSV
router.post('/teacher/tryout/:tryout_id/:subject_id/import_excel', verifyToken, authorize(['teacher']), uploadExcel.single('file'), async (req, res) => {
  try {
    const { tryout_id, subject_id } = req.params;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'File Excel (.xlsx, .xls, .csv) wajib diunggah.' });
    }

    const result = await tryout.importQuestionsFromExcel({
      tryout_id: parseInt(tryout_id, 10),
      subject_id: parseInt(subject_id, 10),
      buffer: req.file.buffer
    });

    res.status(200).json({
      success: true,
      count: result.count,
      message: `Berhasil mengimpor ${result.count} butir soal ke subtes ini!`
    });
  } catch (error) {
    console.error('Import Excel Error:', error);
    res.status(400).json({ message: error.message || 'Gagal memproses file Excel.' });
  }
});

module.exports = router