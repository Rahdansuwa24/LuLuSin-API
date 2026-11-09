var express = require('express')
var router = express.Router()
const studentModel = require('../../models/studentModel')
const tryoutModel = require("../../models/tryoutModel")
const subjectModel = require('../../models/subjectModel')
const { verifyToken, authorize } = require('../../config/middleware/jwt')

//menampilakn seluruh list tryout yang belum di kerjakan dan sudah dikerjakan
router.get('/student/tryout', verifyToken, authorize(['student']), async (req, res, next) => {
  try {
    const idStudent = req.user.id

    const doneTryouts = await studentModel.getDoneTryouts(idStudent)
    const notDoneTryouts = await studentModel.getNotDoneTryouts(idStudent)

    res.status(200).json({
      done: doneTryouts,
      not_done: notDoneTryouts
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})


//menmapilkan nama tryout berdasrkan id
  router.get('/student/tryout/:idTryout', verifyToken, authorize(['student']), async (req, res, next) => {
    try {
      const { idTryout } = req.params

      const getTryout = await tryoutModel.getTryoutName(idTryout)
      const getSubject = await subjectModel.getTotalQuestionAndTotalTime()

      res.status(200).json({ data: getSubject, getTryout })
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  })

//menampilkan soal, gambar soal dan opsi jawaban
//#ok
router.get("/student/tryout/:idTryout/:idSubject/taking", verifyToken, authorize(['student']), async (req, res, next) => {
    const studentId = req.user.id
    const { idTryout, idSubject } = req.params
    const idStudent = req.user.id
  
    try {
      const studentData = await tryoutModel.getStudentById(idStudent)
      const subjectData = await tryoutModel.getSubjectById(idSubject)
      const questionData = await tryoutModel.getQuestionsBySubjectId(idSubject, idTryout, studentId)
      res.status(200).json({ studentData, subjectData, questionData })
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  })

  //membuat jawaban siswa dan membandingkannya dengan jawaban benar

//Ok
  router.post('/student/tryout/:idTryout/:idSubject/:questionId/taking', verifyToken, authorize(['student']), async (req, res, next) => {
    try {
      const idStudent = req.user.id
      const { questionId, idTryout, idSubject } = req.params
      const { answerOptionId } = req.body
  
      const result = await tryoutModel.storeStudentAnswer({ 
        idStudent, 
        questionId, 
        answerOptionId, 
        idSubject, 
        idTryout 
      })
      
      return res.status(201).json({ message: 'CREATED' })
  

    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  })

//update id siswa, id soal, id jawaban 

//void
router.patch('/student/tryout/:idTryout/:idSubject/:questionId/taking', verifyToken, authorize(['student']), async (req, res) => {
  try {
    const idStudent = req.user.id
    const { questionId } = req.params
    const { answer_option_id: answerOptionId } = req.body


    // PERBAIKI: Kirim parameter sebagai object
    const result = await tryoutModel.updateStudentAnswer({ idStudent, questionId, answerOptionId })

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data jawaban tidak ditemukan atau tidak sesuai' })
    }

    return res.status(200).json({ message: 'OK' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

//menghapus jawawabn yang pernah di inputkan siswa

//void

router.delete('/student/tryout/:idTryout/:idSubject/:questionId/taking', verifyToken, authorize(['student']), async (req, res, next) => {
  try {
    const { questionId, idTryout, idSubject } = req.params
    

    const result = await tryoutModel.deleteStudentAnswer(questionId, idSubject, idTryout)
    return res.status(201).json({ message: 'OK' })


    return res.status(201).json({ message: 'OK' })
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  }
)

//membuat halaman transition 
router.get('/student/:idSubject/transition', verifyToken, authorize(['student']), async (req, res) => {
  try {
    const { idSubject } = req.params

    const getSubject = await subjectModel.getSubjectAndCB(idSubject)

    res.status(200).json({getSubject})
  } catch (error) {
    res.status(500).json({ message: error.messag })
  }
})

router.post("/student/tryout/:tryoutId/finalize", verifyToken, authorize(["student"]), async (req, res) => {
  const {tryoutId}  = req.params
  const studentId = req.user.id

    try { 

    const isScoreAlreadyCalculated = await tryoutModel.isScoreAlreadyCalculated(tryoutId, studentId);
    if (isScoreAlreadyCalculated) {
      return res.status(400).json({ message: "Tryout ini sudah dinilai sebelumnya." });
    }
    
    const totalQuestions = await tryoutModel.getTotalQuestionsInTryout(tryoutId);
    const totalAnswered = await tryoutModel.getTotalAnsweredQuestions(tryoutId, studentId);

    if (totalQuestions !== totalAnswered) {
      return res.status(400).json({ message: "Tryout belum lengkap dijawab." });
    }

    const subjectIds = await tryoutModel.getSubjectsInTryout(tryoutId);

  for (const subjectId of subjectIds) {
    await tryoutModel.insertSubjectScore({ tryoutId, studentId, subjectId });
  }

  const checkScoreTryout = await tryoutModel.checkTryOutScore(studentId, tryoutId)
  if (!checkScoreTryout) {
    return res.status(400).json({ message: "Tryout ini sudah dinilai sebelumnya."})
  }
  await tryoutModel.TryoutAggregatedScores(studentId, tryoutId)

    res.status(200).json({ message: "CREATED"});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


//menampilkan soal, gambar soal, opsi jawaban, jawaban benar, jawaban siswa, pembahasan soal
//#update
router.get("/student/tryout/:idTryout/:idSubject/explanation", verifyToken, authorize(['student']), async (req, res, next) => {
  const { idTryout, idSubject } = req.params
  const idStudent = req.user.id

  try {
    const studentData = await tryoutModel.getStudentById(idStudent)
    if (!studentData) {
      return res.status(404).json({ message: 'Data siswa tidak ditemukan' })
    }
    const subjectExpData = await tryoutModel.getExpSubjectById(idSubject)
    if (!subjectExpData) {
      return res.status(404).json({ message: 'Data subjek tidak ditemukan' })
    }
    const detail = await tryoutModel.getTryoutDetailResult(idTryout, idStudent, idSubject)

    res.status(200).json({ studentData, subjectExpData, detail })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}) 

//mennampilkan nilai rata rata, total jawaban benar, salah dan kosong dari total tryout dan menampilkan nilai rata rata, total jawaban benar, salah dan kosong dari total tryout berdasarkan subjek
router.get('/student/tryout/:idTryout/result', verifyToken, authorize(['student']), async (req, res) => {
  try {
    const idStudent = req.user.id
    const { idTryout } = req.params

    const summary = await tryoutModel.getScoreByTryoutId(idTryout, idStudent)
    const perCategorySubject = await tryoutModel.getTryoutResultByCategorySubject(idTryout, idStudent)

    res.status(200).json({ summary, perCategorySubject })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})


// Endpoint untuk mendiskualifikasi siswa (pelanggaran keluar ujian 3x) dengan nilai 0
router.post("/student/tryout/:idTryout/disqualify", verifyToken, authorize(["student"]), async (req, res) => {
  const { idTryout } = req.params;
  const studentId = req.user.id;

  try {
    const isAlreadyCalculated = await tryoutModel.isScoreAlreadyCalculated(idTryout, studentId);
    if (isAlreadyCalculated) {
      return res.status(200).json({ message: "Tryout sudah diselesaikan sebelumnya.", status: "ALREADY_COMPLETED" });
    }

    await tryoutModel.disqualifyStudentTryout(studentId, idTryout);

    res.status(200).json({
      message: "Siswa didiskualifikasi dari tryout karena pelanggaran.",
      status: "DISQUALIFIED",
      score: 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router